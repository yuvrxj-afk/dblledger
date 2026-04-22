import { buildApp } from "./app";

const app = buildApp()

await app.listen({ port: 3030, host: '0.0.0.0' })
