/**
 * Moves registerRoutes handler bodies from controllers into application services.
 * Controllers remain thin Fastify adapters; services hold route handler implementations.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.join(__dirname, "..", "src");

const MODULES = [
  "auth",
  "crm",
  "catalogue",
  "sales",
  "procurement",
  "fulfilment",
  "finance",
  "users",
  "audit",
];

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

for (const key of MODULES) {
  const controllerPath = path.join(
    srcRoot,
    "modules",
    key,
    "presentation",
    `${key}.controller.ts`,
  );
  const servicePath = path.join(
    srcRoot,
    "modules",
    key,
    "application",
    `${key}.service.ts`,
  );

  const controllerSrc = fs.readFileSync(controllerPath, "utf8");
  const match = controllerSrc.match(
    /function registerRoutes\(server: FastifyInstance\): void \{\s*const prisma = service\.prisma;\s*([\s\S]*?)\n  \}\n\n  return/,
  );
  if (!match) {
    console.error(`Could not parse controller: ${key}`);
    process.exit(1);
  }

  const handlersBody = match[1];
  let importsBlock = controllerSrc.split("export function create")[0].trim();
  importsBlock = importsBlock.replace(
    /\nimport \{ \w+Service \} from '\.\.\/application\/[^']+\.service\.js';/,
    "",
  );
  importsBlock = importsBlock.replace(
    /\nimport type \{ PrismaClient \} from '\.\.\/\.\.\/\.\.\/generated\/client\/index\.js';/g,
    "",
  );

  const svcName = `${capitalize(key)}Service`;

  const serviceFile = `${importsBlock}
import type { PrismaClient } from '../../../generated/client/index.js';

/** Application layer for the ${key} bounded context. */
export class ${svcName} {
  constructor(readonly prisma: PrismaClient) {}

  registerRoutes(server: FastifyInstance): void {
    const prisma = this.prisma;
${handlersBody}
  }
}
`;

  const controllerFile = `import type { FastifyInstance } from 'fastify';
import { ${svcName} } from '../application/${key}.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';

export function create${capitalize(key)}Controller(prisma: PrismaClient) {
  const service = new ${svcName}(prisma);
  return {
    registerRoutes(server: FastifyInstance) {
      service.registerRoutes(server);
    },
    service,
  };
}
`;

  fs.writeFileSync(servicePath, serviceFile);
  fs.writeFileSync(controllerPath, controllerFile);
  console.log(`Moved handlers to service: ${key}`);
}
