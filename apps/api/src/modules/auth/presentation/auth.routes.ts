import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { createAuthController } from './auth.controller.js';

export async function authRoutes(server: FastifyInstance): Promise<void> {
  const controller = createAuthController(getPrismaClient());
  server.get('/auth/me', (req, reply) => controller.getSession(req, reply));
  server.post<{ Body?: { email?: string; userId?: string } }>('/auth/login', (req, reply) => controller.login(req, reply));
  server.post('/auth/logout', (req, reply) => controller.logout(req, reply));
}
