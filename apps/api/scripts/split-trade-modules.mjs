/**
 * One-time refactor helper: splits trade.routes.ts body into per-module route registrars.
 * Run from apps/api: node scripts/split-trade-modules.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiRoot = path.join(__dirname, "..");
const srcRoot = path.join(apiRoot, "src");
const sourcePath = path.join(srcRoot, "presentation/routes/trade.routes.ts");

const MODULE_SECTIONS = [
  { key: "auth", titleMatch: "AUTHENTICATION & SESSION" },
  { key: "crm", titleMatch: "CRM & PIPELINE" },
  { key: "catalogue", titleMatch: "PRODUCT CATALOGUE" },
  { key: "sales", titleMatch: "QUOTES & SALES ORDERS" },
  { key: "procurement", titleMatch: "PROCUREMENT" },
  { key: "fulfilment", titleMatch: "SUPPLIER-DIRECT FULFILMENT" },
  { key: "finance", titleMatch: "FINANCE" },
  { key: "users", titleMatch: "USER MANAGEMENT" },
  { key: "audit", titleMatch: "AUDIT & GOVERNANCE" },
];

const raw = fs.readFileSync(sourcePath, "utf8");
const lines = raw.split(/\r?\n/);

const sectionStartIdx = [];
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("// -------------------------------------------------------------")) {
    const next = lines[i + 1] || "";
    for (const mod of MODULE_SECTIONS) {
      if (next.includes(mod.titleMatch)) {
        sectionStartIdx.push({ key: mod.key, start: i });
      }
    }
  }
}

sectionStartIdx.sort((a, b) => a.start - b.start);

const tradeFnStart = lines.findIndex((l) => l.includes("export async function tradeRoutes"));
const bodyStart = lines.findIndex(
  (l, i) => i > tradeFnStart && l.includes("const prisma = getPrismaClient()"),
);

function extractBlock(startLine, endLine) {
  return lines.slice(startLine, endLine).join("\n");
}

for (let s = 0; s < sectionStartIdx.length; s++) {
  const { key, start } = sectionStartIdx[s];
  const end = s + 1 < sectionStartIdx.length ? sectionStartIdx[s + 1].start : lines.length - 1;
  let block = extractBlock(start + 2, end);

  // Remove trailing closing brace of tradeRoutes if present
  block = block.replace(/\n}\s*$/, "");

  const moduleDir = path.join(srcRoot, "modules", key);
  const presDir = path.join(moduleDir, "presentation");
  fs.mkdirSync(presDir, { recursive: true });

  const routesContent = `import { FastifyInstance } from 'fastify';
import { getPrismaClient } from '../../../infrastructure/database/prisma.js';
import { create${capitalize(key)}Controller } from './${key}.controller.js';

export async function ${key}Routes(server: FastifyInstance): Promise<void> {
  const prisma = getPrismaClient();
  const controller = create${capitalize(key)}Controller(prisma);

${indent(block.replace(/^\s{2}/gm, "  "), 2)}
}
`;

  fs.writeFileSync(path.join(presDir, `${key}.routes.ts`), routesContent);
  console.log(`Wrote ${key}.routes.ts (${end - start} lines)`);
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function indent(text, spaces) {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((l) => (l.trim() ? pad + l : l))
    .join("\n");
}

console.log("Done. Next: generate controllers and services manually or via pass 2.");
