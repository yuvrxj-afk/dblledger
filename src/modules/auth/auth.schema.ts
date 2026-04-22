export const registerBodySchema = {
    type: "object",
    additionalProperties: false,
    required: ["email", "password"],
    properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8 }
    },
} as const;

export const loginBodySchema = {
    type: "object",
    additionalProperties: false,
    required: ["email", "password"],
    properties: {
        email: { type: "string", format: "email" },
        password: { type: "string", minLength: 8 }
    },
} as const;
