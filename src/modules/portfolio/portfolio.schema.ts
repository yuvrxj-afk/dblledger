
export const txBodySchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["userId", "amount", "description"],
        properties: {
            userID: { type: "string" },
            description: { type: "string" },
            amount: { type: "number" },
        }
    },
} as const;