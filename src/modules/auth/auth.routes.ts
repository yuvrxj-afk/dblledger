import type { FastifyPluginAsync } from "fastify"
import { loginBodySchema, registerBodySchema } from "./auth.schema"
import { EmailAlreadyExistsError, loginUser, registerUser } from "./auth.service"
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../utils/jwt";

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
        const accessToken = await signAccessToken({ sub: user.id, role: user.role })
        const sid = crypto.randomUUID()
        const jti = crypto.randomUUID()

        const refreshToken = await signRefreshToken({ sub: user.id, sid, jti })

        reply.setCookie("refresh_token", refreshToken, {
            httpOnly: true,
            sameSite: "lax",
            path: '/auth/refresh',
            secure: false,
        })
        return reply.code(200).send({ message: "logged in", accessToken: accessToken });
    })

    app.get("/me", async (req, reply) => {
        const auth = req.headers.authorization

        if (!auth || !auth.startsWith("Bearer ")) {
            return reply.code(401).send({ message: "missing access token" })
        }

        const token = auth.slice("Bearer ".length)
        try {
            const { sub, role } = await verifyAccessToken(token)
            return reply.code(200).send({ user: { id: sub, role: role } })
        } catch (error) {
            return reply.code(401).send({ message: "invalid token" })
        }
    })

    app.get("/admin", async (req, reply) => {
        const auth = req.headers.authorization

        if (!auth || !auth.startsWith("Bearer ")) {
            return reply.code(401).send({ message: "missing access token" })
        }

        const token = auth.slice("Bearer ".length)

        try {
            const { sub, role } = await verifyAccessToken(token)
            if (role !== "admin") return reply.code(403).send({ message: "invalid admin login!" })
            return reply.code(200).send({ message: "welcome admin!" })
        } catch (error) {
            return reply.code(401).send({ message: "invalid token" })
        }
    })

    app.post("/refresh", async (req, reply) => {
        const cookie = req.cookies.refresh_token
        if (!cookie) return reply.send(401)
        const status = await verifyRefreshToken(cookie)
        if (!status) {
            return reply.code(401).send({ message: "incorrect token" })
        }
        
    })
}