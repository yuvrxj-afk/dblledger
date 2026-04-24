import type { FastifyPluginAsync } from "fastify";
import { getPortfolio } from "./portfolio.service";

export const portfolioRoutes: FastifyPluginAsync = async (app) => {
    app.get<{ Params: { userId: string } }>("/:userId", async (req, reply) => {
        const data = await getPortfolio(req.params.userId)
        if (!data || data.length === 0) {
            return reply.code(404).send({ message: "No transactions found!" })
        }

        return reply.code(200).send({ portfolio: data })
    })
}