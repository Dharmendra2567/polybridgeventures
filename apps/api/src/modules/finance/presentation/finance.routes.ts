import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../../infrastructure/database/prisma.js";
import { createFinanceController } from "./finance.controller.js";

export async function financeRoutes(server: FastifyInstance): Promise<void> {
  createFinanceController(getPrismaClient()).registerRoutes(server);
}
