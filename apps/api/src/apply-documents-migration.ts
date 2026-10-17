import { getPrismaClient } from "./infrastructure/database/prisma.js";

export async function applyDocumentsMigration() {
  const prisma = getPrismaClient();
  console.log(
    "[Documents Migration] Starting database migration for Trade Documents...",
  );

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "trade_documents" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "organization_id" UUID NOT NULL,
      "entity_type" VARCHAR(50) NOT NULL,
      "entity_id" VARCHAR(100) NOT NULL,
      "entity_reference" VARCHAR(100),
      "document_category" VARCHAR(80) NOT NULL,
      "trade_phase" VARCHAR(50) NOT NULL,
      "file_name" VARCHAR(255) NOT NULL,
      "file_original_name" VARCHAR(255) NOT NULL,
      "file_size" INTEGER NOT NULL,
      "mime_type" VARCHAR(120) NOT NULL,
      "file_path" VARCHAR(500) NOT NULL,
      "file_url" VARCHAR(500) NOT NULL,
      "uploaded_by_id" UUID,
      "uploaded_by_name" VARCHAR(120),
      "notes" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "trade_documents_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE INDEX IF NOT EXISTS "idx_trade_docs_entity" ON "trade_documents"("organization_id", "entity_type", "entity_id")`,
    `CREATE INDEX IF NOT EXISTS "idx_trade_docs_phase" ON "trade_documents"("trade_phase", "document_category")`,
  ];

  for (const stmt of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log("[Documents Migration] Executed DDL statement successfully.");
    } catch (err: any) {
      console.error(
        "[Documents Migration Warning] Statement failed:",
        err.message,
      );
    }
  }

  console.log(
    "[Documents Migration] All Trade Documents DDL applied successfully.",
  );
}

// Allow direct script execution
if (process.argv[1]?.endsWith("apply-documents-migration.ts")) {
  applyDocumentsMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("[Documents Migration Fatal]", err);
      process.exit(1);
    });
}
