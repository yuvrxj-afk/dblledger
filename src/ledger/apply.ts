import { getEntry } from "./storage";

export async function applyJob(jobId: string, fence: number): Promise<Boolean> {
    const current = await getEntry(jobId)

    
}