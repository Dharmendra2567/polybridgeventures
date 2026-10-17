import { getPrismaClient } from "./infrastructure/database/prisma.js";

export async function applyFxMigration() {
  const prisma = getPrismaClient();
  console.log(
    "[FX Migration] Starting database migration for Market Countries and FX Exchange Rates...",
  );

  const ddlStatements = [
    `CREATE TABLE IF NOT EXISTS "market_countries" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "organization_id" UUID NOT NULL,
      "country_code" VARCHAR(10) NOT NULL,
      "country_name" VARCHAR(80) NOT NULL,
      "currency_code" VARCHAR(10) NOT NULL,
      "currency_name" VARCHAR(80) NOT NULL,
      "currency_symbol" VARCHAR(10) NOT NULL DEFAULT '$',
      "exchange_rate_to_usd" DECIMAL(18,6) NOT NULL DEFAULT 1.0,
      "is_base_currency" BOOLEAN NOT NULL DEFAULT false,
      "is_active" BOOLEAN NOT NULL DEFAULT true,
      "notes" TEXT,
      "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "market_countries_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "market_countries_org_code_unique" UNIQUE ("organization_id", "country_code")
    )`,
    `CREATE TABLE IF NOT EXISTS "exchange_rate_pairs" (
      "id" UUID NOT NULL DEFAULT gen_random_uuid(),
      "organization_id" UUID NOT NULL,
      "from_country_id" UUID NOT NULL,
      "to_country_id" UUID NOT NULL,
      "from_currency" VARCHAR(10) NOT NULL,
      "to_currency" VARCHAR(10) NOT NULL,
      "rate" DECIMAL(18,6) NOT NULL,
      "is_custom_override" BOOLEAN NOT NULL DEFAULT false,
      "effective_date" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "exchange_rate_pairs_pkey" PRIMARY KEY ("id"),
      CONSTRAINT "exchange_rate_pairs_unique_pair" UNIQUE ("organization_id", "from_country_id", "to_country_id"),
      CONSTRAINT "fk_exchange_rate_from_country" FOREIGN KEY ("from_country_id") REFERENCES "market_countries"("id") ON DELETE CASCADE,
      CONSTRAINT "fk_exchange_rate_to_country" FOREIGN KEY ("to_country_id") REFERENCES "market_countries"("id") ON DELETE CASCADE
    )`,
    `ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "exchange_rate_to_usd" DECIMAL(18,6) DEFAULT 1.0`,
    `ALTER TABLE "quotes" ADD COLUMN IF NOT EXISTS "total_amount_usd" DECIMAL(14,4) DEFAULT 0`,
    `ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "exchange_rate_to_usd" DECIMAL(18,6) DEFAULT 1.0`,
    `ALTER TABLE "sales_orders" ADD COLUMN IF NOT EXISTS "total_amount_usd" DECIMAL(14,4) DEFAULT 0`,
    `ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "exchange_rate_to_usd" DECIMAL(18,6) DEFAULT 1.0`,
    `ALTER TABLE "purchase_orders" ADD COLUMN IF NOT EXISTS "total_cost_usd" DECIMAL(14,4) DEFAULT 0`,
  ];

  for (const stmt of ddlStatements) {
    try {
      await prisma.$executeRawUnsafe(stmt);
      console.log("[FX Migration] Executed statement successfully.");
    } catch (err: any) {
      console.error("[FX Migration Warning] Statement failed:", err.message);
    }
  }

  console.log("[FX Migration] DDL applied successfully.");
}

applyFxMigration()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
