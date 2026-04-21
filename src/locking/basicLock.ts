import { redisClients } from "../infra/redisClient";

const redis = redisClients[0];

export async function acquireBasicLock(key: string, ttlMs: number): Promise<string | null> {
    if (!redis) throw new Error("Redis client not initialized");

    const value = crypto.randomUUID();
    const ok = await redis.set(key, value, "PX", ttlMs, "NX");
    return ok === "OK" ? value : null;
}


export async function releaseBasicLock(key: string, value: string): Promise<boolean> {
    if (!redis) throw new Error("Redis client not initialized");

    const lua = `
    if redis.call("GET",KEYS[1]) == ARGV[1]
    then return redis.call("DEL",KEYS[1])
    else return 0 end
    `;
    const result = await redis.eval(lua, 1, key, value);
    return result === 1;
}