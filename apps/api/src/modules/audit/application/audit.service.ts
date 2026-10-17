import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { logger } from "../../../infrastructure/logging/logger.js";
import type { PrismaClient } from "../../../generated/client/index.js";

/** Application layer for the audit bounded context. */
export class AuditService {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
    // -------------------------------------------------------------
    // AUDIT & GOVERNANCE (Pure Database)
    // -------------------------------------------------------------
    server.get(
      "/audit/logs",
      async (_req: FastifyRequest, reply: FastifyReply) => {
        try {
          const dbLogs = await prisma.auditLog.findMany({
            orderBy: { timestamp: "desc" },
            take: 100,
            include: { actor: true },
          });

          const logs = dbLogs.map((l) => ({
            id: l.id,
            timestamp: l.timestamp.toISOString(),
            actor: l.actor
              ? `${l.actor.firstName} ${l.actor.lastName}`
              : (l.changesDiff as Record<string, string>)?.actor ||
                "Rahul Patel (Managing Partner)",
            action: l.action,
            entity: l.targetEntityType,
            entityId: l.targetEntityId,
            details:
              (l.changesDiff as Record<string, string>)?.details ||
              `${l.action} ${l.targetEntityType}`,
          }));

          return reply.send({ logs });
        } catch (err) {
          logger.error({ err }, "[Audit] Failed to load audit logs from DB");
          return reply.status(500).send({ error: (err as Error).message });
        }
      },
    );
  }
}
