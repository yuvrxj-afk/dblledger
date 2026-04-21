import { redisClients } from "../infra/redisClient";
import type { LedgerEntry } from "./model";

const redis = redisClients[0]

export async function getEntry(jobId: string): Promise<LedgerEntry | null> {
    const raw = await redis?.get(`ledger:${jobId}`)
    return raw ? JSON.parse(raw) : null
}

export async function saveEntry(entry: LedgerEntry) {
    await redis?.set(`ledger:${entry.jobId}`, JSON.stringify(entry))
}