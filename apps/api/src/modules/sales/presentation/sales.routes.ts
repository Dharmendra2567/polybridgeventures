import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../../infrastructure/database/prisma.js";
import { createSalesController } from "./sales.controller.js";

export async function salesRoutes(server: FastifyInstance): Promise<void> {
  createSalesController(getPrismaClient()).registerRoutes(server);
}
