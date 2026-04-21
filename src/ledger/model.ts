export type JobState = "PENDING" | "APPLIED"

export interface LedgerEntry {
    jobId: string;
    state: JobState;
    fence: number
}

