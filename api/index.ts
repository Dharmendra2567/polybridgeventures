import type { IncomingMessage, ServerResponse } from "node:http";
import { buildServer } from "../apps/api/src/server.js";
import type { FastifyInstance } from "fastify";

let fastifyApp: FastifyInstance | null = null;

async function initFastify(): Promise<FastifyInstance> {
  if (!fastifyApp) {
    fastifyApp = await buildServer({
      logger: false,
    });
    await fastifyApp.ready();
  }
  return fastifyApp;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const app = await initFastify();
  app.server.emit("request", req, res);
}
