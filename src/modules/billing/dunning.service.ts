import { db } from "../../plugins/db";

export async function runDunningStep(stripeSubscriptionId: string) {
    const rows = await db`
    SELECT status, dunning_attempt
    FROM subscriptions
    WHERE stripe_subscription_id = ${stripeSubscriptionId}
    `
    if (rows.length === 0) return { action: "not_found" }

    const sub = rows[0] as { status: string; dunning_attempt: number }
    if (sub.status === 'canceled') return { action: 'already_canceled' }

    if (sub.dunning_attempt < 3) {
        await db`
        UPDATE subscriptions
        SET dunning_attempt = dunning_attempt + 1
        WHERE stripe_subscription_id = ${stripeSubscriptionId}
        `

        return { action: 'retrying', attempt: sub.dunning_attempt + 1 }
    }

    if (sub.dunning_attempt >= 3) {
        await db`
        UPDATE subscriptions
        SET status = 'canceled', dunning_attempt = dunning_attempt + 1
        WHERE stripe_subscription_id = ${stripeSubscriptionId}
        `

        return { action: 'canceled' }
    }
}

