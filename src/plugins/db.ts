import postgres from "postgres";

export const db = postgres("postgres://app:app_password@localhost:5433/app_db")

