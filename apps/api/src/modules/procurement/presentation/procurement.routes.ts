import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../../infrastructure/database/prisma.js";
import { createProcurementController } from "./procurement.controller.js";

export async function procurementRoutes(
  server: FastifyInstance,
): Promise<void> {
  createProcurementController(getPrismaClient()).registerRoutes(server);
}
