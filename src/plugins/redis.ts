import Redis from "ioredis";
import { REDIS_URL } from "../config/env";

export const redis = new Redis(REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: null })

redis.on("error", (err) => {
    console.error("[Redis] connection error:", err.message)
})

redis.on("connect", () => {
    console.log("[Redis] connected");
});

redis.on("close", () => {
    console.warn("[Redis] connection closed");
});