import { redis } from "../plugins/redis"

const userId = "c9a475db-9ede-4f64-9127-152c1a0f375e"

await fetch("http://localhost:3030/portfolio/transaction", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, amount: 100, description: "seed" })
})

await redis.del(`portfolio:${userId}`)

const start = Date.now()
const requests = Array.from({ length: 50 }, () =>
    fetch(`http://localhost:3030/portfolio/${userId}`)
)

const results = await Promise.all(requests)

console.log(`${results.length} requests completed in ${Date.now() - start}ms`)

process.exit()