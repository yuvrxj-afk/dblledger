import type { FastifyPluginAsync } from "fastify"
import { loginBodySchema, registerBodySchema } from "./auth.schema"
import { EmailAlreadyExistsError, getUserById, loginUser, registerUser } from "./auth.service"
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from "../../utils/jwt";
import { redis } from "../../plugins/redis";

type AuthBody = { email: string; password: string };

const REFRESH_COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, path: "/auth", secure: false };

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

        await redis.set(`session:${sid}`, jti, "EX", 60 * 60 * 24 * 7)

        const refreshToken = await signRefreshToken({ sub: user.id, sid, jti })

        reply.setCookie("refresh_token", refreshToken, REFRESH_COOKIE_OPTS)
        return reply.code(200).send({ message: "logged in", accessToken, user });
    })

    app.post("/logout", async (req, reply) => {
        const refreshToken = req.cookies.refresh_token
        const auth = req.headers.authorization

        // Invalidate refresh session in Redis
        if (refreshToken) {
            try {
                const { sid } = await verifyRefreshToken(refreshToken)
                await redis.del(`session:${sid}`)
            } catch {}
        }

        // Blocklist access token so /me and /admin reject it immediately
        if (auth?.startsWith("Bearer ")) {
            try {
                const { jti, exp } = await verifyAccessToken(auth.slice("Bearer ".length))
                const remainingTtlSeconds = Math.floor(exp - Date.now() / 1000)
                if (remainingTtlSeconds > 0) {
                    await redis.set(`blocklist:${jti}`, "1", "EX", remainingTtlSeconds)
                }
            } catch {}
        }

        reply.setCookie("refresh_token", "", REFRESH_COOKIE_OPTS)
        return reply.code(200).send({ message: "logged out!" })
    })

    app.get("/me", async (req, reply) => {
        const auth = req.headers.authorization

        if (!auth || !auth.startsWith("Bearer ")) {
            return reply.code(401).send({ message: "missing access token" })
        }

        const token = auth.slice("Bearer ".length)
        try {
            const { sub, role, jti } = await verifyAccessToken(token)
            const blocked = await redis.get(`blocklist:${jti}`)
            if (blocked) return reply.code(401).send({ message: "token revoked" })
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
            const { role, jti } = await verifyAccessToken(token)
            const blocked = await redis.get(`blocklist:${jti}`)
            if (blocked) return reply.code(401).send({ message: "token revoked" })
            if (role !== "admin") return reply.code(403).send({ message: "forbidden" })
            return reply.code(200).send({ message: "welcome admin!" })
        } catch (error) {
            return reply.code(401).send({ message: "invalid token" })
        }
    })

    app.post("/refresh", async (req, reply) => {
        const token = req.cookies.refresh_token
        if (!token) return reply.code(401).send({ message: "missing refresh token" })

        try {
            const { sub, sid, jti } = await verifyRefreshToken(token)

            const user = await getUserById(sub)
            if (!user) return reply.code(401).send({ message: "invalid refresh token" })

            const currentJTI = await redis.get(`session:${sid}`)

            if (!currentJTI || currentJTI != jti) {
                await redis.del(`session:${sid}`)
                return reply.code(401).send({ message: "invalid refresh token" })
            }

            const accessToken = await signAccessToken({ sub, role: user.role })

            const newJti = crypto.randomUUID()

            await redis.set(`session:${sid}`, newJti, "EX", 60 * 60 * 24 * 7)
            const newRefreshToken = await signRefreshToken({ sub, sid, jti: newJti })

            reply.setCookie("refresh_token", newRefreshToken, REFRESH_COOKIE_OPTS)

            return reply.code(200).send({ accessToken })
        } catch (error) {
            return reply.code(401).send({ message: "invalid refresh token" })
        }
    })
}