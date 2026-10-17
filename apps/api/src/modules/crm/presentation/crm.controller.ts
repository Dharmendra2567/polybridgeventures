import type { FastifyInstance } from 'fastify';
import { CrmService } from '../application/crm.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';

export function createCrmController(prisma: PrismaClient) {
  const service = new CrmService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
