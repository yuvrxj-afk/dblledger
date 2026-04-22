import type { FastifyPluginAsync } from "fastify"
import { loginBodySchema, registerBodySchema } from "./auth.schema"
import { EmailAlreadyExistsError, loginUser, registerUser } from "./auth.service"

type AuthBody = { email: string; password: string };

export const authRoutes: FastifyPluginAsync = async (app) => {
    app.post<{ Body: AuthBody }>("/register", { schema: { body: registerBodySchema } }, async (req, reply) => {
        const { email, password } = req.body
        try {
            const user = await registerUser(email, password);
            return reply.code(201).send({ message: "user created!", user })
        } catch (error) {
            if (error instanceof EmailAlreadyExistsError) {
                return reply.code(409).send({ message: "email already registered" })
            }
            throw error;
        }
    })

    app.post<{ Body: AuthBody }>("/login", { schema: { body: loginBodySchema } }, async (req, reply) => {
        const { email, password } = req.body
        const user = await loginUser(email, password);
        if (!user) return reply.code(401).send({ message: "invalid credentials" });
        return reply.code(200).send({ message: "logged in", user });
    })
}