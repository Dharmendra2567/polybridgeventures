import type { FastifyInstance } from "fastify";
import { AuditService } from "../application/audit.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export function createAuditController(prisma: PrismaClient) {
  const service = new AuditService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
