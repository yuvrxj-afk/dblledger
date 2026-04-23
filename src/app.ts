import fastify from "fastify";
import { authRoutes } from "./modules/auth/auth.routes";
import fastifyCookie from "@fastify/cookie";

export function buildApp() {
    const app = fastify({ logger: true })

    app.register(fastifyCookie)

    app.register(authRoutes, { prefix: '/auth' })
    app.get("/health", async () => ({ ok: true }))
    return app;
}