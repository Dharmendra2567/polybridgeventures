/**
 * Peels Fastify from application services into controllers + explicit routers.
 * Run from apps/api: node scripts/peel-fastify-from-services.mjs
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

function singularize(name) {
  const special = {
    pos: "PurchaseOrder",
    "purchase-orders": "PurchaseOrder",
    "supplier-bills": "SupplierBill",
    payments: "Payment",
    logs: "Logs",
    quotes: "Quote",
    orders: "Order",
    shipments: "Shipment",
    invoices: "Invoice",
    products: "Product",
    suppliers: "Supplier",
    accounts: "Account",
    leads: "Lead",
    users: "User",
  };
  if (special[name]) return special[name];
  if (name.endsWith("ies")) return capitalize(name.slice(0, -3) + "y");
  if (name.endsWith("s")) return capitalize(name.slice(0, -1));
  return capitalize(name);
}

function pascalFromKebab(name) {
  return name
    .split("-")
    .map((p) => capitalize(p))
    .join("");
}

function methodNameFromRoute(httpMethod, routePath) {
  const specials = {
    "GET /auth/me": "getSession",
    "POST /auth/login": "login",
    "POST /auth/logout": "logout",
  };
  const key = `${httpMethod} ${routePath}`;
  if (specials[key]) return specials[key];

  const segments = routePath.split("/").filter(Boolean);
  const params = segments.filter((s) => s.startsWith(":"));
  const literals = segments.filter((s) => !s.startsWith(":"));
  const resourceSeg = [...literals].reverse().find((s) => s !== literals[0]) || literals[literals.length - 1];
  const resource = singularize(resourceSeg);
  const last = segments[segments.length - 1];
  const extraAction = last && !last.startsWith(":") && last !== resourceSeg ? pascalFromKebab(last) : "";

  if (extraAction && params.length) {
    const verb =
      httpMethod === "GET"
        ? "get"
        : httpMethod === "DELETE"
          ? "delete"
          : extraAction.toLowerCase() === "status"
            ? "update"
            : extraAction.charAt(0).toLowerCase() + extraAction.slice(1);
    if (extraAction.toLowerCase() === "status") return `${verb}${resource}Status`;
    if (["approve", "convert", "deliver", "issue", "pay"].includes(extraAction.toLowerCase())) {
      return `${extraAction.charAt(0).toLowerCase() + extraAction.slice(1)}${resource}`;
    }
    if (extraAction === "GenerateInvoice") return `generate${resource}Invoice`;
    if (extraAction === "GenerateBill") return `generate${resource}Bill`;
    return `${verb}${resource}${extraAction}`;
  }

  if (!params.length) {
    if (httpMethod === "GET") return `list${resource === "Logs" ? "Logs" : resource + (resource.endsWith("s") ? "" : "s")}`;
    if (httpMethod === "POST") return `create${resource}`;
  }
  if (httpMethod === "GET") return `get${resource}`;
  if (httpMethod === "POST") return `create${resource}`;
  if (httpMethod === "PUT") return `update${resource}`;
  if (httpMethod === "PATCH") return `patch${resource}`;
  if (httpMethod === "DELETE") return `delete${resource}`;
  return `${httpMethod.toLowerCase()}${resource}`;
}

function findMatchingBrace(src, openIdx) {
  let depth = 0;
  let inStr = null;
  let escaped = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inStr) inStr = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === "`") {
      inStr = ch;
      continue;
    }
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error("Unbalanced braces");
}

function transformReply(body) {
  return body
    .replace(/return reply\.status\(([^)]+)\)\.send\(([\s\S]*?)\);/g, "return { status: $1, body: $2 };")
    .replace(/return reply\.send\(([\s\S]*?)\);/g, "return { status: 200, body: $1 };");
}

function stripHandlerSignature(sig) {
  const m = sig.match(/async\s*\(([^)]*)\)/);
  if (!m) return { usesReq: false, reqType: "{ body?: unknown; params?: Record<string, string> }" };
  const args = m[1].trim();
  if (!args || args.startsWith("_req")) {
    return { usesReq: false, reqType: null };
  }
  const typeMatch = args.match(/FastifyRequest<(\{[\s\S]*\})>/);
  if (typeMatch) {
    const t = typeMatch[1]
      .replace(/\s+/g, " ")
      .replace(/Body:/g, "body?:")
      .replace(/Params:/g, "params:");
    return { usesReq: true, reqType: t };
  }
  return { usesReq: true, reqType: "{ body?: unknown; params?: Record<string, string> }" };
}

function indent(text, n) {
  const pad = " ".repeat(n);
  return text
    .split("\n")
    .map((l) => (l.length ? pad + l : l))
    .join("\n");
}

function extractRegisterBody(src) {
  const marker = "registerRoutes(server: FastifyInstance): void {";
  const idx = src.indexOf(marker);
  if (idx < 0) throw new Error("registerRoutes not found");
  const open = src.indexOf("{", idx);
  const close = findMatchingBrace(src, open);
  return src.slice(open + 1, close);
}

function parseRegisterBody(body) {
  const namedFns = new Map();
  const helpers = [];
  const routes = [];
  let i = 0;
  const src = body;

  while (i < src.length) {
    while (i < src.length && /\s/.test(src[i])) i++;
    if (i >= src.length) break;

    const rest = src.slice(i);

    if (rest.startsWith("//")) {
      const nl = src.indexOf("\n", i);
      i = nl < 0 ? src.length : nl + 1;
      continue;
    }

    const helperFn = rest.match(/^async function (\w+)\s*\(([^)]*)\)\s*\{/);
    if (helperFn) {
      const name = helperFn[1];
      const open = src.indexOf("{", i);
      const close = findMatchingBrace(src, open);
      const fnBody = src.slice(open + 1, close);
      helpers.push({ name, params: helperFn[2], body: fnBody });
      i = close + 1;
      continue;
    }

    const named = rest.match(/^const (\w+) = async \(/);
    if (named) {
      const name = named[1];
      const sigEnd = src.indexOf("=>", i);
      const sig = src.slice(i, sigEnd);
      const open = src.indexOf("{", sigEnd);
      const close = findMatchingBrace(src, open);
      const fnBody = src.slice(open + 1, close);
      namedFns.set(name, { name, sig: sig.replace(/^const \w+ = /, ""), body: fnBody });
      i = close + 1;
      if (src[i] === ";") i++;
      continue;
    }

    const route = rest.match(/^server\.(get|post|put|patch|delete)\('([^']+)',\s*/);
    if (route) {
      const httpMethod = route[1];
      const routePath = route[2];
      i += route[0].length;
      const after = src.slice(i);
      if (after.startsWith("async")) {
        const sigEnd = src.indexOf("=>", i);
        const sig = src.slice(i, sigEnd);
        const open = src.indexOf("{", sigEnd);
        const close = findMatchingBrace(src, open);
        const fnBody = src.slice(open + 1, close);
        routes.push({ httpMethod, routePath, inline: true, sig, body: fnBody });
        i = close + 1;
        if (src[i] === ")") i++;
        if (src[i] === ";") i++;
      } else {
        const idMatch = after.match(/^(\w+)\s*\)\s*;/);
        if (!idMatch) throw new Error(`Could not parse route at: ${after.slice(0, 80)}`);
        routes.push({ httpMethod, routePath, inline: false, handlerName: idMatch[1] });
        i += idMatch[0].length;
      }
      continue;
    }

    if (rest.startsWith("const prisma = this.prisma;")) {
      i += "const prisma = this.prisma;".length;
      continue;
    }

    throw new Error(`Unrecognized token near: ${rest.slice(0, 120)}`);
  }

  return { namedFns, helpers, routes };
}

for (const key of MODULES) {
  const svcName = `${capitalize(key)}Service`;
  const ctrlName = `${capitalize(key)}Controller`;
  const servicePath = path.join(srcRoot, "modules", key, "application", `${key}.service.ts`);
  const controllerPath = path.join(srcRoot, "modules", key, "presentation", `${key}.controller.ts`);
  const routesPath = path.join(srcRoot, "modules", key, "presentation", `${key}.routes.ts`);

  const src = fs.readFileSync(servicePath, "utf8");
  const importsBlock = src.split("export class")[0].trim();
  const cleanedImports = importsBlock
    .replace(/import type \{ FastifyInstance, FastifyRequest, FastifyReply \} from 'fastify';\n?/, "")
    .replace(/import type \{ FastifyInstance, FastifyRequest, FastifyReply \} from "fastify";\n?/, "")
    .trim();

  const registerBody = extractRegisterBody(src);
  const { namedFns, helpers, routes } = parseRegisterBody(registerBody);

  const usedNames = new Set();
  function uniqueName(base) {
    let n = base;
    let i = 2;
    while (usedNames.has(n)) {
      n = `${base}${i}`;
      i++;
    }
    usedNames.add(n);
    return n;
  }

  const serviceMethods = [];
  const controllerMethods = [];
  const routeLines = [];
  const handlerToMethod = new Map();

  for (const [hName, h] of namedFns) {
    const firstRoute = routes.find((r) => r.handlerName === hName);
    const base = firstRoute
      ? methodNameFromRoute(firstRoute.httpMethod.toUpperCase(), firstRoute.routePath)
      : hName.replace(/Handler$/, "");
    const method = uniqueName(base);
    handlerToMethod.set(hName, method);
    const { usesReq, reqType } = stripHandlerSignature(h.sig);
    const transformed = transformReply(h.body);
    const sig = usesReq ? `req: ${reqType}` : "";
    serviceMethods.push(
      `  async ${method}(${sig}): Promise<HttpResult> {\n    const prisma = this.prisma;\n${indent(transformed.trim(), 4)}\n  }`,
    );
    const cArgs = usesReq
      ? "req: FastifyRequest, reply: FastifyReply"
      : "_req: FastifyRequest, reply: FastifyReply";
    const call = usesReq ? `this.service.${method}(req)` : `this.service.${method}()`;
    controllerMethods.push(
      `  async ${method}(${cArgs}) {\n    return sendResult(reply, await ${call});\n  }`,
    );
  }

  for (const route of routes) {
    let method;
    if (!route.inline) {
      method = handlerToMethod.get(route.handlerName);
    } else {
      method = uniqueName(methodNameFromRoute(route.httpMethod.toUpperCase(), route.routePath));
      const { usesReq, reqType } = stripHandlerSignature(route.sig);
      const transformed = transformReply(route.body);
      const sig = usesReq ? `req: ${reqType}` : "";
      serviceMethods.push(
        `  async ${method}(${sig}): Promise<HttpResult> {\n    const prisma = this.prisma;\n${indent(transformed.trim(), 4)}\n  }`,
      );
      const cArgs = usesReq
        ? "req: FastifyRequest, reply: FastifyReply"
        : "_req: FastifyRequest, reply: FastifyReply";
      const call = usesReq ? `this.service.${method}(req)` : `this.service.${method}()`;
      controllerMethods.push(
        `  async ${method}(${cArgs}) {\n    return sendResult(reply, await ${call});\n  }`,
      );
    }
    routeLines.push(
      `  server.${route.httpMethod}('${route.routePath}', (req, reply) => controller.${method}(req, reply));`,
    );
  }

  const helperMethods = helpers.map((h) => {
    const params = h.params;
    let body = h.body;
    for (const helper of helpers) {
      body = body.replaceAll(`${helper.name}(`, `this.${helper.name}(`);
    }
    return `  async ${h.name}(${params}) {\n    const prisma = this.prisma;\n${indent(body.trim(), 4)}\n  }`;
  });

  // Rewrite helper calls inside service methods
  let joinedServiceMethods = [...helperMethods, ...serviceMethods].join("\n\n");
  for (const helper of helpers) {
    joinedServiceMethods = joinedServiceMethods.replaceAll(`${helper.name}(`, `this.${helper.name}(`);
    joinedServiceMethods = joinedServiceMethods.replaceAll(`this.this.${helper.name}(`, `this.${helper.name}(`);
  }

  const serviceFile = `${cleanedImports}
import type { HttpResult } from '../../../shared/http-result.js';
import type { PrismaClient } from '../../../generated/client/index.js';

/** Application layer for the ${key} bounded context. */
export class ${svcName} {
  constructor(readonly prisma: PrismaClient) {}

${joinedServiceMethods}
}
`;

  const controllerFile = `import type { FastifyRequest, FastifyReply } from 'fastify';
import { sendResult } from '../../../shared/http-result.js';
import { ${svcName} } from '../application/${key}.service.js';
import type { PrismaClient } from '../../../generated/client/index.js';

export class ${ctrlName} {
  constructor(private readonly service: ${svcName}) {}

${controllerMethods.join("\n\n")}
}

export function create${ctrlName}(prisma: PrismaClient) {
  return new ${ctrlName}(new ${svcName}(prisma));
}
`;

  const routesFile = `import type { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { create${ctrlName} } from './${key}.controller.js';

export async function ${key}Routes(server: FastifyInstance): Promise<void> {
  const controller = create${ctrlName}(getPrismaClient());
${routeLines.join("\n")}
}
`;

  fs.writeFileSync(servicePath, serviceFile);
  fs.writeFileSync(controllerPath, controllerFile);
  fs.writeFileSync(routesPath, routesFile);
  console.log(`Peeled ${key}: ${routes.length} routes, ${serviceMethods.length} service methods, ${helpers.length} helpers`);
}
