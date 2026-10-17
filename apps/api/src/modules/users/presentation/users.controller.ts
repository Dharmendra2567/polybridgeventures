import type { FastifyInstance } from "fastify";
import { UsersService } from "../application/users.service.js";
import type { PrismaClient } from "../../../generated/client/index.js";

export function createUsersController(prisma: PrismaClient) {
  const service = new UsersService(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
