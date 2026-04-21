import Redis from "ioredis";

export const redisClients = [
    new Redis(6379),
    new Redis(6380),
    new Redis(6381)
]