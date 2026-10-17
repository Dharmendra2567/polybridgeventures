import type { FastifyInstance } from "fastify";
import { FinanceService } from "../application/finance.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export function createFinanceController(prisma: PrismaClient) {
  const service = new FinanceService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
