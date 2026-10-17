import type { FastifyInstance } from "fastify";
import { FulfilmentService } from "../application/fulfilment.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export function createFulfilmentController(prisma: PrismaClient) {
  const service = new FulfilmentService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
