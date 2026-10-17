import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { createAuditController } from './audit.controller.js';

export async function auditRoutes(server: FastifyInstance): Promise<void> {
  createAuditController(getPrismaClient()).registerRoutes(server);
}
