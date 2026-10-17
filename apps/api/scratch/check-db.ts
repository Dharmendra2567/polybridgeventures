import { getPrismaClient } from "../src/infrastructure/database/prisma.js";

async function check() {
  const p = getPrismaClient();
  const tables: any = await p.$queryRawUnsafe(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public'",
  );
  console.log(
    "Tables in DB:",
    tables.map((t: any) => t.table_name),
  );
  const org = await p.organization.findFirst();
  console.log("Org in DB:", org?.name, "Base currency:", org?.baseCurrency);
}

check()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
