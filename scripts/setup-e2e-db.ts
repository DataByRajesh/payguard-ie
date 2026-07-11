import { config } from "dotenv";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.test") });

// `.env.test` is a gitignored, optional local override — on a fresh clone it won't exist, and
// without this fallback `env.DATABASE_URL` would be undefined here, silently letting Prisma fall
// back to whatever `.env` points at (the interactive dev database) instead of the disposable one.
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "file:./prisma/test.db" };

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
