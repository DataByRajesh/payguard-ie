import { config } from "dotenv";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.test") });

const env = { ...process.env };

// The test database is a disposable fixture, never real data — always start it from a clean
// file so schema migrations never have to reconcile against a previous test run's rows.
const testDbPath = path.resolve(__dirname, "../prisma/test.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const filePath = `${testDbPath}${suffix}`;
  if (existsSync(filePath)) rmSync(filePath);
}

console.log(`Preparing e2e test database at ${env.DATABASE_URL}`);
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });
