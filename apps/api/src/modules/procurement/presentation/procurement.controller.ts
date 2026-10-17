import type { FastifyInstance } from "fastify";
import { ProcurementService } from "../application/procurement.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export function createProcurementController(prisma: PrismaClient) {
  const service = new ProcurementService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
