import { db } from "../../plugins/db";

export async function checkAndRecordEvent(stripeEventId: string, eventType: string) {
    try {
        await db`INSERT INTO webhook_events (stripe_event_id,event_type) VALUES (${stripeEventId},${eventType})`
        return { duplicate: false }
    } catch (error) {
        const err = error as { code?: string }
        if (err.code === "23505") return { duplicate: true }
        throw err;
    }
}