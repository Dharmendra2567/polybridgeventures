import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../../infrastructure/database/prisma.js";
import { createCrmController } from "./crm.controller.js";

export async function crmRoutes(server: FastifyInstance): Promise<void> {
  createCrmController(getPrismaClient()).registerRoutes(server);
}
