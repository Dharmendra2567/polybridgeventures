/**
 * Splits trade.routes.monolith.ts into per-module controller + service + routes.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, "..");
const srcRoot = path.join(apiRoot, "src");
const sourcePath = path.join(srcRoot, "presentation/routes/trade.routes.monolith.ts");

const SECTIONS = [
  { key: "auth", start: 78, end: 204 },
  { key: "crm", start: 205, end: 913 },
  { key: "catalogue", start: 914, end: 1052 },
  { key: "sales", start: 1053, end: 1750 },
  { key: "procurement", start: 1751, end: 2157 },
  { key: "fulfilment", start: 2158, end: 2366 },
  { key: "finance", start: 2367, end: 2705 },
  { key: "users", start: 2706, end: 2961 },
  { key: "audit", start: 2962, end: 2988 },
];

const MODULE_IMPORTS = {
  auth: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { logAudit } from '../../../shared/audit.service.js';
import { UUID_REGEX } from '../../../shared/uuid.util.js';
import {
  getCurrentSessionUserId,
  setCurrentSessionUserId,
  clearCurrentSessionUserId,
} from '../../../shared/session.store.js';
import { UserProfile } from '../../trade-data.js';
import { AuthService } from '../application/auth.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  crm: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { LeadItem, AccountItem, SupplierItem } from '../../trade-data.js';
import { CrmService } from '../application/crm.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  catalogue: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { ProductItem } from '../../trade-data.js';
import { CatalogueService } from '../application/catalogue.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  sales: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { QuoteItem, SalesOrderItem } from '../../trade-data.js';
import { SalesService } from '../application/sales.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  procurement: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { SupplierItem, PurchaseOrderItem } from '../../trade-data.js';
import { ProcurementService } from '../application/procurement.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  fulfilment: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { ShipmentItem } from '../../trade-data.js';
import { FulfilmentService } from '../application/fulfilment.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  finance: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { InvoiceItem } from '../../trade-data.js';
import { FinanceService } from '../application/finance.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  users: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { getOrganizationId } from '../../../shared/organization.context.js';
import { logAudit } from '../../../shared/audit.service.js';
import { getCurrentSessionUserId } from '../../../shared/session.store.js';
import { UserProfile } from '../../trade-data.js';
import { UsersService } from '../application/users.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
  audit: `import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../../infrastructure/logging/logger.js';
import { AuditService } from '../application/audit.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';`,
};

const raw = fs.readFileSync(sourcePath, "utf8");
const lines = raw.split(/\r?\n/);

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function dedent(block, spaces = 2) {
  const prefix = " ".repeat(spaces);
  return block
    .split("\n")
    .map((l) => (l.startsWith(prefix) ? l.slice(spaces) : l))
    .join("\n");
}

function patchSessionRefs(body, moduleKey) {
  let patched = body;
  if (moduleKey === "auth" || moduleKey === "users") {
    patched = patched.replace(
      /currentSessionUserId = dbUser\.id/g,
      "setCurrentSessionUserId(dbUser.id)",
    );
    patched = patched.replace(
      /currentSessionUserId = null/g,
      "clearCurrentSessionUserId()",
    );
    patched = patched.replace(/\bcurrentSessionUserId\b/g, "getCurrentSessionUserId()");
    patched = patched.replace(
      /if \(getCurrentSessionUserId\(\)\) \{\s*await logAudit\('User', 'LOGOUT', 'UserSession', getCurrentSessionUserId\(\), 'User signed out', getCurrentSessionUserId\(\)\);/g,
      "const sessionUserId = getCurrentSessionUserId();\n      if (sessionUserId) {\n        await logAudit('User', 'LOGOUT', 'UserSession', sessionUserId, 'User signed out', sessionUserId);",
    );
  }
  return patched;
}

for (const section of SECTIONS) {
  const block = lines.slice(section.start - 1, section.end).join("\n");
  const handlersBody = patchSessionRefs(dedent(block, 2), section.key);

  const moduleDir = path.join(srcRoot, "modules", section.key);
  const appDir = path.join(moduleDir, "application");
  const presDir = path.join(moduleDir, "presentation");
  fs.mkdirSync(appDir, { recursive: true });
  fs.mkdirSync(presDir, { recursive: true });

  const svcName = capitalize(section.key);
  const imports = MODULE_IMPORTS[section.key];

  const serviceFile = `import type { PrismaClient } from '../../../generated/client/index.js';

/** Application layer for the ${section.key} bounded context. */
export class ${svcName}Service {
  constructor(readonly prisma: PrismaClient) {}
}
`;

  const controllerFile = `${imports}

export function create${svcName}Controller(prisma: PrismaClient) {
  const service = new ${svcName}Service(prisma);

  function registerRoutes(server: FastifyInstance): void {
    const prisma = service.prisma;
${handlersBody
  .split("\n")
  .map((l) => "    " + l)
  .join("\n")}
  }

  return { registerRoutes, service };
}
`;

  const routesFile = `import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { create${svcName}Controller } from './${section.key}.controller.js';

export async function ${section.key}Routes(server: FastifyInstance): Promise<void> {
  create${svcName}Controller(getPrismaClient()).registerRoutes(server);
}
`;

  fs.writeFileSync(path.join(appDir, `${section.key}.service.ts`), serviceFile);
  fs.writeFileSync(path.join(presDir, `${section.key}.controller.ts`), controllerFile);
  fs.writeFileSync(path.join(presDir, `${section.key}.routes.ts`), routesFile);
  console.log(`Generated module: ${section.key}`);
}

const indexRoutes = `import type { FastifyInstance } from 'fastify';
${SECTIONS.map((s) => `import { ${s.key}Routes } from '../../modules/${s.key}/presentation/${s.key}.routes.js';`).join("\n")}

/** Aggregates sidebar-aligned trade modules under \`/api/v1\`. */
export async function tradeRoutes(server: FastifyInstance): Promise<void> {
${SECTIONS.map((s) => `  await server.register(${s.key}Routes);`).join("\n")}
}
`;

fs.writeFileSync(path.join(srcRoot, "presentation/routes/trade.routes.ts"), indexRoutes);
console.log("Updated presentation/routes/trade.routes.ts");
