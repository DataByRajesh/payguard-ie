import { config } from "dotenv";
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env") });

/**
 * Thin wrapper around `pg_dump` -- see docs/BACKUP_AND_RECOVERY.md for the full runbook,
 * including pulling a Preview/Production connection string first via `vercel env pull`.
 * Writes into a gitignored ./backups/ directory; never touches the source database.
 */
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://payguard:payguard@localhost:5432/payguard_dev";

function main() {
  const backupsDir = path.resolve(__dirname, "../backups");
  mkdirSync(backupsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const outFile = path.join(backupsDir, `backup-${timestamp}.dump`);

  console.log(`Backing up ${databaseUrl} to ${outFile}`);
  execSync(`pg_dump "${databaseUrl}" -F c -f "${outFile}"`, { stdio: "inherit" });
  console.log("Done. Restore with: pg_restore --clean --if-exists -d <DATABASE_URL> " + outFile);
}

main();
