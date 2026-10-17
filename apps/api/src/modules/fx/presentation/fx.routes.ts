import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { createFxController } from './fx.controller.js';

export async function fxRoutes(server: FastifyInstance): Promise<void> {
  createFxController(getPrismaClient()).registerRoutes(server);
}
