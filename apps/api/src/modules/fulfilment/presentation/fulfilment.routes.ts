import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { createFulfilmentController } from './fulfilment.controller.js';

export async function fulfilmentRoutes(server: FastifyInstance): Promise<void> {
  createFulfilmentController(getPrismaClient()).registerRoutes(server);
}
