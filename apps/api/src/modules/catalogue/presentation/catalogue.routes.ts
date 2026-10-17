import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../../infrastructure/database/prisma.js";
import { createCatalogueController } from "./catalogue.controller.js";

export async function catalogueRoutes(server: FastifyInstance): Promise<void> {
  createCatalogueController(getPrismaClient()).registerRoutes(server);
}
