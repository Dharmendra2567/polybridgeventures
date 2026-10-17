import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { createUsersController } from './users.controller.js';

export async function usersRoutes(server: FastifyInstance): Promise<void> {
  createUsersController(getPrismaClient()).registerRoutes(server);
}
