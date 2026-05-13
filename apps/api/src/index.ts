import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, setGlobalDispatcher } from "undici";
import { loadConfig } from "./config.js";
import { registerRoutes } from "./routes.js";

const config = loadConfig();

setGlobalDispatcher(
  new Agent({
    bodyTimeout: config.requestTimeoutMs,
    connect: {
      timeout: config.connectTimeoutMs
    },
    headersTimeout: config.requestTimeoutMs
  })
);

const app = Fastify({
  logger: true
});

await app.register(cors, {
  origin: config.isProduction ? false : config.corsOrigin
});

registerRoutes(app, config.pbUrl);

const webDistPath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../web/dist"
);

if (existsSync(webDistPath)) {
  await app.register(fastifyStatic, {
    root: webDistPath
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.sendFile("index.html");
  });
}

await app.listen({
  host: "0.0.0.0",
  port: config.port
});
