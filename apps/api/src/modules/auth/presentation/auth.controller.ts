import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendResult } from '../../../shared/http-result.js';
import { AuthService } from '../application/auth.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  async getSession(_req: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await this.service.getSession());
  }

  async login(req: FastifyRequest<{ Body?: { email?: string; userId?: string } }>, reply: FastifyReply) {
    return sendResult(reply, await this.service.login(req));
  }

  async logout(_req: FastifyRequest, reply: FastifyReply) {
    return sendResult(reply, await this.service.logout());
  }
}

export function createAuthController(prisma: PrismaClient) {
  return new AuthController(new AuthService(prisma));
}
