# MVP 2 — Billing Webhook Handler

**Stack:** Fastify + Postgres + Redis + BullMQ + Stripe test mode  
**Branch:** `billing`  
**Rule:** One ticket = one commit. Build in order.

---

## Ticket 1 — Foundation
**Commit:** `feat(billing): foundation — migrations, queue plugin, env config`

Setup everything that needs to exist before any real code runs.

### What to build
- **DB migrations** — two new tables:
  - `subscriptions`
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `user_id UUID REFERENCES users(id)`
    - `stripe_customer_id TEXT`
    - `stripe_subscription_id TEXT UNIQUE`
    - `status TEXT` — values: `active`, `past_due`, `canceled`, `trialing`
    - `current_period_end TIMESTAMPTZ`
    - `dunning_attempt INT NOT NULL DEFAULT 0`
    - `created_at TIMESTAMPTZ DEFAULT now()`
  - `webhook_events` — the idempotency table
    - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
    - `stripe_event_id TEXT UNIQUE NOT NULL`
    - `event_type TEXT NOT NULL`
    - `processed_at TIMESTAMPTZ DEFAULT now()`

- **`docker-compose.yml`** — add a Redis service (currently missing from compose, only in `.env`)

- **`src/config/env.ts`** — add:
  - `STRIPE_SECRET_KEY`
  - `STRIPE_WEBHOOK_SECRET`

- **`.env`** — add those two keys (get them from Stripe dashboard → Developers → Webhooks → test mode)

- **`src/plugins/queue.ts`** — exports a `billingQueue` (BullMQ `Queue` instance connected to Redis)

- **Install deps:**
  ```bash
  bun add stripe bullmq
  ```

---

## Ticket 2 — Webhook Route + Signature Verification
**Commit:** `feat(billing): webhook route with raw body + stripe signature verification`

### The learning moment
Stripe signature verification breaks if Fastify has already parsed the body as JSON.
`stripe.webhooks.constructEvent()` needs the **exact raw bytes** that arrived over the wire.
Fastify auto-parses `application/json` bodies before your handler runs — you have to intercept this.

**Deliberately break it first:** write the route without the raw body override, fire a test event,
watch `constructEvent` throw `No signatures found matching the expected signature`. Then fix it.

### What to build
- **`src/modules/billing/billing.routes.ts`**
  - This is a Fastify plugin (encapsulated scope)
  - Inside the plugin scope, **before** declaring the route, override the content-type parser:
    ```ts
    app.addContentTypeParser('application/json', { parseAs: 'buffer' }, (req, body, done) => done(null, body))
    ```
  - This override is scoped — it only affects routes inside this plugin, not auth routes
  - `POST /webhook/stripe`:
    1. Read `stripe-signature` header
    2. Call `stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET)`
    3. Wrap in try/catch — return `400` on verification failure
    4. For now: log `event.type` and return `{ received: true }`

- **`src/app.ts`** — register billing routes under `/webhook`

---

## Ticket 3 — Idempotency Guard
**Commit:** `feat(billing): idempotency guard blocks duplicate webhook replays`

### The learning moment
Stripe guarantees **at-least-once delivery** — the same event will arrive more than once.
Without this layer you'll double-credit, double-charge, or corrupt subscription state.
The `UNIQUE` constraint on `stripe_event_id` is your last line of defense.

**Prove it works:** after building this, use Stripe CLI to send the same event twice:
```bash
stripe trigger invoice.paid
# then resend the same event ID
```
Watch the second call return `200` immediately without touching the DB.

### What to build
- **`src/modules/billing/billing.service.ts`** — `checkAndRecordEvent(stripeEventId, eventType)`:
  - Attempts `INSERT INTO webhook_events (stripe_event_id, event_type) VALUES (...)`
  - If Postgres throws unique violation (`code 23505`, same as `EmailAlreadyExistsError` in auth) → return `{ duplicate: true }`
  - Otherwise → return `{ duplicate: false }`

- **`billing.routes.ts`** (update):
  - After `constructEvent`, call `checkAndRecordEvent`
  - If `duplicate` → return `200 { received: true }` immediately, stop

---

## Ticket 4 — BullMQ Worker + Subscription State Transitions
**Commit:** `feat(billing): bullmq worker handles subscription state transitions`

### The learning moment
The route does exactly three things: **verify → deduplicate → enqueue**. That's it.
All business logic lives in the worker. The HTTP response and the actual work are decoupled.
This is what makes the system resilient — a crashed worker doesn't lose events, it retries them.

### What to build
- **`billing.routes.ts`** (update):
  - After idempotency passes: `await billingQueue.add(event.type, { event })`
  - Route returns `200`. Done.

- **`src/modules/billing/billing.worker.ts`** — BullMQ `Worker`:
  - `invoice.paid` → `UPDATE subscriptions SET status = 'active'` (match on `stripe_subscription_id` from event data)
  - `invoice.payment_failed` → call dunning service (Ticket 5)
  - `customer.subscription.deleted` → `UPDATE subscriptions SET status = 'canceled'`
  - Unknown event types → log and skip (no throw — don't poison the queue)

- **`src/workers/index.ts`** — separate process entrypoint:
  ```ts
  import './billing.worker'
  // starts the worker, runs forever
  ```

- **`package.json`** — add script:
  ```json
  "worker": "bun run src/workers/index.ts"
  ```

Run the two processes separately:
```bash
bun run src/index.ts          # HTTP server
bun run worker                # worker process
```

---

## Ticket 5 — Dunning State Machine + Retry Backoff
**Commit:** `feat(billing): dunning state machine with exponential backoff`

### The learning moment
Payment failure isn't binary. Real systems retry with increasing delays, notify the customer,
and only cancel after exhausting attempts. You have to enumerate every state transition:
what if retry 1 fails? What if the subscription is already canceled when retry 2 fires?
Enumerating edge cases *is* the exercise.

### What to build
- **`src/modules/billing/dunning.service.ts`** — `runDunningStep(stripeSubscriptionId)`:
  1. Read current `dunning_attempt` + `status` from DB
  2. Guard: if `status === 'canceled'` → return early (idempotent)
  3. If `dunning_attempt < 3`:
     - Increment `dunning_attempt`
     - Keep `status = 'past_due'`
     - Return `{ shouldRetry: true, attempt: n }`
  4. If `dunning_attempt >= 3`:
     - Set `status = 'canceled'`
     - Return `{ shouldRetry: false }`

- **`billing.worker.ts`** (update):
  - On `invoice.payment_failed` → call `runDunningStep` instead of a raw DB update

- **`src/plugins/queue.ts`** (update) — add retry config:
  ```ts
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 1000 }
  }
  ```
  This means: if the worker throws, BullMQ retries after 1s, 2s, 4s automatically.

---

## Quick Reference

| # | Ticket | Key Learning |
|---|--------|-------------|
| 1 | Foundation | Tables, queue plugin, env wiring |
| 2 | Signature verification | Raw body vs parsed body; Fastify plugin encapsulation |
| 3 | Idempotency | Unique constraint as dedup; at-least-once delivery |
| 4 | Worker + state transitions | Route vs worker separation; BullMQ basics |
| 5 | Dunning state machine | Failure state enumeration; retry backoff |

## Stripe CLI Cheatsheet (useful throughout)
```bash
# Install
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local server
stripe listen --forward-to localhost:3000/webhook/stripe

# Trigger test events
stripe trigger invoice.paid
stripe trigger invoice.payment_failed
stripe trigger customer.subscription.deleted
```
