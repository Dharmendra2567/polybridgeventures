import type { FastifyInstance } from 'fastify';
import { FxService } from '../application/fx.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';

export function createFxController(prisma: PrismaClient) {
  const service = new FxService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
