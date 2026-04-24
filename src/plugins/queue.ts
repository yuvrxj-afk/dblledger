import { Queue } from "bullmq";
import { REDIS_URL } from "../config/env";

export const billingQueue = new Queue("billing", {
    connection: { url: REDIS_URL },
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 1000 }
    }
});


