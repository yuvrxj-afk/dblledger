import { jwtVerify, SignJWT, } from "jose";

function getAccessSecret() {
    const secret = process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET")
    return new TextEncoder().encode(secret)
}


function getRefreshSecret() {
    const secret = process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("JWT_REFRESH_SECRET")
    return new TextEncoder().encode(secret)
}

export async function signAccessToken(input: { sub: string, role: string }): Promise<string> {
    const ttl = "15m"
    return await new SignJWT({ role: input.role })
        .setExpirationTime(ttl)
        .setIssuedAt()
        .setSubject(input.sub)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .sign(getAccessSecret())
}

export async function verifyAccessToken(token: string) {
    const { payload } = await jwtVerify(token, getAccessSecret())
    const sub = payload.sub
    const role = payload.role

    if (typeof sub !== "string") throw new Error("token missing sub");
    if (typeof role !== "string") throw new Error("token missing role");
    return { sub, role };
}


export async function signRefreshToken(input: { sub: string, sid: string, jti: string }): Promise<string> {
    const refreshTtl = "7d"
    return await new SignJWT({ jti: input.jti, sub: input.sub, sid: input.sid })
        .setExpirationTime(refreshTtl)
        .setIssuedAt()
        .setSubject(input.sub)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setJti(input.jti)
        .sign(getRefreshSecret())
}


export async function verifyRefreshToken(token: string): Promise<{ sub: string, sid: string, jti: string }> {
    const { payload } = await jwtVerify(token, getRefreshSecret())
    const sub = payload.sub
    const jti = payload.jti
    const sid = payload.sid

    if (typeof sub !== "string") throw new Error("token missing sub");
    if (typeof jti !== "string") throw new Error("token missing jti");
    if (typeof sid !== "string") throw new Error("token missing sid");
    return { sub, sid, jti };
}