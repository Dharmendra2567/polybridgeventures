import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../../infrastructure/database/prisma.js";
import { createDocumentsController } from "./documents.controller.js";

export async function documentsRoutes(server: FastifyInstance): Promise<void> {
  createDocumentsController(getPrismaClient()).registerRoutes(server);
}
