import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPrismaClient } from './infrastructure/database/prisma.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function applyMigration() {
  const prisma = getPrismaClient();
  const sqlPath = path.resolve(__dirname, '../prisma/migration.sql');
  
  console.log(`[Migration] Reading SQL migration from: ${sqlPath}`);
  const sql = fs.readFileSync(sqlPath, 'utf8');

  // Strip comments
  const cleanSql = sql.replace(/--.*$/gm, '');
  
  // Split SQL by semicolons
  const rawStatements = cleanSql
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  console.log(`[Migration] Executing ${rawStatements.length} DDL statements sequentially...`);

  let executed = 0;
  for (const statement of rawStatements) {
    if (!statement) continue;
    try {
      await prisma.$executeRawUnsafe(statement);
      executed++;
      if (executed % 10 === 0 || executed === rawStatements.length) {
        console.log(`[Migration] Progress: ${executed}/${rawStatements.length} statements executed.`);
      }
    } catch (err: unknown) {
      console.warn(`[Migration Warning] Statement failed: "${statement.slice(0, 50)}..."`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`[Migration] Done. Successfully executed ${executed} statements.`);


}

applyMigration()
  .then(() => {
    console.log('[Migration] Completed successfully.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('[Migration Failed]', err);
    process.exit(1);
  });

