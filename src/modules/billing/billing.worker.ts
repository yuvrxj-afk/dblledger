import { Job, Worker } from "bullmq";
import { REDIS_URL } from "../../config/env";
import { db } from "../../plugins/db";

export const worker = new Worker("billing", async (job: Job) => {
    switch (job.name) {
        case "invoice.paid": {
            const subId = job.data.event.data.object.subscription
            await db`UPDATE subscriptions SET status = 'active' WHERE stripe_subscription_id = ${subId}`
            return
        }
        case "invoice.payment_failed": {
            const subId = job.data.event.data.object.subscription
            await db`UPDATE subscriptions SET status = 'past_due' WHERE stripe_subscription_id = ${subId}`
            return
        }
        case "customer.subscription.deleted": {
            const subId = job.data.event.data.object.id
            await db`UPDATE subscriptions SET status = 'canceled' WHERE stripe_subscription_id = ${subId}`
            return
        }
        default:
            return
    }
}, { connection: { url: REDIS_URL } })

worker.on("completed", (job) => console.log(`job ${job.id} completed: ${job.name}`))
worker.on("failed", (job, err) => console.error(`job ${job?.id} failed: ${job?.name}`, err))
