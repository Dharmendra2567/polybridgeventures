import type { FastifyInstance } from 'fastify';
import { CatalogueService } from '../application/catalogue.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';

export function createCatalogueController(prisma: PrismaClient) {
  const service = new CatalogueService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
