import { getPrismaClient } from "../infrastructure/database/prisma.js";
import { logger } from "../infrastructure/logging/logger.js";
import { getOrganizationId } from "./organization.context.js";
import { toUuid, UUID_REGEX } from "./uuid.util.js";

export async function logAudit(
  actorName: string,
  action: string,
  entity: string,
  entityId: string,
  details: string,
  actorId?: string,
): Promise<void> {
  try {
    const prisma = getPrismaClient();
    const orgId = await getOrganizationId();
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        actorId: actorId && UUID_REGEX.test(actorId) ? actorId : undefined,
        action,
        targetEntityType: entity,
        targetEntityId: toUuid(entityId),
        ipAddress: "127.0.0.1",
        correlationId: `corr-${Date.now()}`,
        changesDiff: { actor: actorName, details },
      },
    });
  } catch (err) {
    logger.warn({ err }, "[Audit] Audit log database persistence failed");
  }
}
