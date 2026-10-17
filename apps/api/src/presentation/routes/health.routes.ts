import { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  SystemHealthResponse,
  SystemReadinessResponse,
} from "@polybridge/contracts";
import { getPrismaClient } from "../../infrastructure/database/prisma.js";

const startTime = Date.now();

export const healthRoutes: FastifyPluginAsync = async (
  fastify: FastifyInstance,
) => {
  // Liveness Check
  fastify.get("/health", async (_req, reply) => {
    const uptimeSeconds = Math.floor((Date.now() - startTime) / 1000);
    const response: SystemHealthResponse = {
      status: "ok",
      version: "0.1.0",
      uptimeSeconds,
      timestamp: new Date().toISOString(),
    };
    return reply.status(200).send(response);
  });

  // Readiness Check
  fastify.get("/ready", async (_req, reply) => {
    let dbStatus: "connected" | "disconnected" | "error" = "disconnected";

    try {
      const prisma = getPrismaClient();
      // Execute lightweight raw query to test database connection pool
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = "connected";
    } catch {
      dbStatus = "error";
    }

    const isReady = dbStatus === "connected";
    const response: SystemReadinessResponse = {
      status: isReady ? "ready" : "not_ready",
      checks: {
        database: dbStatus,
        storage: "ready",
      },
      timestamp: new Date().toISOString(),
    };

    const statusCode = isReady ? 200 : 503;
    return reply.status(statusCode).send(response);
  });
};
