import postgres from "postgres";
import { DB_CONNECTION } from "../config/env";

export const db = postgres(DB_CONNECTION)

