export const DB_CONNECTION =
    process.env.DB_CONNECTION ?? "postgres://app:app_password@localhost:5433/app_db";

export const ACCESS_TTL = process.env.ACCESS_TTL ?? "15m";
export const REFRESH_TTL = process.env.REFRESH_TTL ?? "7d";

export const JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET ?? "";
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? "";
export const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";

