import type { FastifyInstance } from "fastify";
import { SalesService } from "../application/sales.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export function createSalesController(prisma: PrismaClient) {
  const service = new SalesService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
