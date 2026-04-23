import { Queue } from "bullmq";
import { REDIS_URL } from "../config/env";

export const billingQueue = new Queue("billing", { connection: { url: REDIS_URL } });


