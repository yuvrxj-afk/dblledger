import { redis } from "../plugins/redis"

export async function withLock<T>(
    key: string,
    ttlSeconds: number,
    fn: () => Promise<T>
): Promise<T> {
    const lockKey = `lock:${key}`
    const acquired = await redis.set(lockKey, "1", "EX", ttlSeconds,"NX")

    if (acquired === "OK") {
        try {
            return await fn();
        } finally {
            await redis.del(lockKey)
        }
    }
    await new Promise(resolve => setTimeout(resolve, 50))
    return withLock(key, ttlSeconds, fn)
}