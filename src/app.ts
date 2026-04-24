import fastify from "fastify";
import { authRoutes } from "./modules/auth/auth.routes";
import fastifyCookie from "@fastify/cookie";
import { billingRoutes } from "./modules/billing/billing.route";

export function buildApp() {
    const app = fastify({ logger: true })

    app.register(fastifyCookie)

    app.register(authRoutes, { prefix: '/auth' })
    app.register(billingRoutes, { prefix: "/webhook" })
    app.get("/health", async () => ({ ok: true }))
    return app;
}