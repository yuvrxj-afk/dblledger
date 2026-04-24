
export const txBodySchema = {
    body: {
        type: "object",
        additionalProperties: false,
        required: ["userId", "amount", "description"],
        properties: {
            userId: { type: "string" },
            description: { type: "string" },
            amount: { type: "number" },
        }
    },
} as const;