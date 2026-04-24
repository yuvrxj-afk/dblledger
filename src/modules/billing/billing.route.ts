import { type FastifyPluginAsync } from "fastify";
import Stripe from "stripe";
import { STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET } from "../../config/env";

const stripe = new Stripe(STRIPE_SECRET_KEY)

export const billingRoutes: FastifyPluginAsync = async (app) => {
    app.addContentTypeParser("application/json",
        { parseAs: "buffer" }, (_req, body, done) => {
            done(null, body)
        })

    app.post<{ Body: Buffer }>("/stripe", async (req, reply) => {
        const signature = req.headers["stripe-signature"]

        if (!signature) return reply.code(400).send({ error: "missing stripe-signature header" })
        try {

            const event = await stripe.webhooks.constructEventAsync(req.body, signature, STRIPE_WEBHOOK_SECRET)
            req.log.info({ type: event.type }, "stripe event received")
            reply.code(200).send({ received: true })

        } catch (error) {
            req.log.error(error, "stripe webhook error")
            return reply.code(400).send({ error: "invalid signature" })
        }
    })
}