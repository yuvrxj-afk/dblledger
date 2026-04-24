import { db } from "../../plugins/db";
import { redis } from "../../plugins/redis";

export async function getPortfolioFromDB(id: string) {
    return await db`
    SELECT id ,user_id, amount, description, created_at FROM transactions WHERE user_id = ${id} 
    `
}

export async function getPortfolio(userId: string) {
    try {
        const hit = await redis.get(`portfolio:${userId}`)
        if (hit) { return JSON.parse(hit) }
    } catch { } // Redis down — fall through

    const data = await getPortfolioFromDB(userId)

    try {
        await redis.set(`portfolio:${userId}`, JSON.stringify(data), 'EX', 60)
    } catch { } // Redis down — still return data

    return data
}