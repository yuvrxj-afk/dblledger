import { db } from "../../plugins/db";
import { redis } from "../../plugins/redis";
import { withLock } from "../../utils/redisLock";

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

    return withLock(`portfolio:${userId}`, 5, async () => {
        try {
            const hit = await redis.get(`portfolio:${userId}`)
            if (hit) { return JSON.parse(hit) }
        } catch { }

        const data = await getPortfolioFromDB(userId)

        try {
            await redis.set(`portfolio:${userId}`, JSON.stringify(data), 'EX', 60)
        } catch { }
        
        return data;
    })
}

export async function createTransaction(userId: string, amount: number, description: string) {
    await db`
    INSERT INTO transactions (user_id,amount,description)
    VALUES (${userId},${amount},${description})
    `

    try {
        await redis.del(`portfolio:${userId}`)
    }
    catch { }
}