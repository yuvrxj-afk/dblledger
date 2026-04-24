import type { FastifyPluginAsync } from "fastify";
import { createTransaction, getPortfolio } from "./portfolio.service";
import { txBodySchema } from "./portfolio.schema";

export const portfolioRoutes: FastifyPluginAsync = async (app) => {
    app.get<{ Params: { userId: string } }>("/:userId", async (req, reply) => {
        const data = await getPortfolio(req.params.userId)
        if (!data || data.length === 0) {
            return reply.code(404).send({ message: "No transactions found!" })
        }

        return reply.code(200).send({ portfolio: data })
    })

    app.post<{ Body: { userId: string, amount: number, description: string } }>(
        "/transaction", { schema: txBodySchema },
        async (req, reply) => {
            const { userId, amount, description } = req.body
            await createTransaction(userId, amount, description)
            return reply.code(201).send({ message: "transaction created" })
        })
}