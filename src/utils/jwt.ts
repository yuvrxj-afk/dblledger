import { jwtVerify, SignJWT } from "jose";
import { ACCESS_TTL, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET, REFRESH_TTL } from "../config/env";

function getAccessSecret() {
    const secret = JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET;
    if (!secret) throw new Error("JWT_ACCESS_SECRET missing")
    return new TextEncoder().encode(secret)
}


function getRefreshSecret() {
    const secret = JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET;
    if (!secret) throw new Error("JWT_REFRESH_SECRET missing")
    return new TextEncoder().encode(secret)
}

export async function signAccessToken(input: { sub: string; role: string }): Promise<string> {
    const ttl = ACCESS_TTL;
    return await new SignJWT({ role: input.role })
        .setExpirationTime(ttl)
        .setIssuedAt()
        .setSubject(input.sub)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .sign(getAccessSecret())
}

export async function verifyAccessToken(token: string): Promise<{ sub: string; role: string }> {
    const { payload } = await jwtVerify(token, getAccessSecret())
    const sub = payload.sub
    const role = payload.role

    if (typeof sub !== "string") throw new Error("token missing sub");
    if (typeof role !== "string") throw new Error("token missing role");
    return { sub, role };
}


export async function signRefreshToken(input: { sub: string; sid: string; jti: string }): Promise<string> {
    const refreshTtl = REFRESH_TTL;
    return await new SignJWT({ sid: input.sid })
        .setExpirationTime(refreshTtl)
        .setIssuedAt()
        .setSubject(input.sub)
        .setProtectedHeader({ alg: "HS256", typ: "JWT" })
        .setJti(input.jti)
        .sign(getRefreshSecret())
}


export async function verifyRefreshToken(token: string): Promise<{ sub: string; sid: string; jti: string }> {
    const { payload } = await jwtVerify(token, getRefreshSecret())
    const sub = payload.sub
    const jti = payload.jti
    const sid = payload.sid

    if (typeof sub !== "string") throw new Error("token missing sub");
    if (typeof jti !== "string") throw new Error("token missing jti");
    if (typeof sid !== "string") throw new Error("token missing sid");
    return { sub, sid, jti };
}