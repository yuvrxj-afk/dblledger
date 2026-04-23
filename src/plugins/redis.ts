import Redis from "ioredis";
import { REDIS_URL } from "../config/env";

export const redis = new Redis(REDIS_URL)