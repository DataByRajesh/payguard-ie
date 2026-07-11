import { config } from "dotenv";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.vitest") });

// `.env.vitest` is a gitignored, optional local override — on a fresh clone it won't exist, and
// without this fallback `env.DATABASE_URL` would be undefined here, silently letting Prisma fall
// back to whatever `.env` points at (the interactive dev database) instead of the disposable one.
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "file:./prisma/vitest.db" };

// Service/persistence-layer Vitest specs run against a real (disposable) SQLite database rather
// than mocking Prisma, so a stale file is always wiped before migrating fresh — same idiom as
// scripts/setup-e2e-db.ts.
const testDbPath = path.resolve(__dirname, "../prisma/vitest.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const filePath = `${testDbPath}${suffix}`;
  if (existsSync(filePath)) rmSync(filePath);
}

console.log(`Preparing vitest database at ${env.DATABASE_URL}`);
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
