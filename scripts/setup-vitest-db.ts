import { config } from "dotenv";
import { execSync } from "node:child_process";
import path from "node:path";
import { resetPostgresSchema } from "./reset-postgres-schema";

config({ path: path.resolve(__dirname, "../.env.vitest") });

// `.env.vitest` is a gitignored, optional local override — on a fresh clone it won't exist, and
// without this fallback `env.DATABASE_URL` would be undefined here, silently letting Prisma fall
// back to whatever `.env` points at (the interactive dev database) instead of the disposable one.
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://payguard:payguard@localhost:5432/payguard_vitest",
};

// Service/persistence-layer Vitest specs run against a real (disposable) Postgres database rather
// than mocking Prisma, so it's always reset to a clean, migrated schema before tests run — same
// idiom as scripts/setup-e2e-db.ts, minus the seed (these specs manage their own fixtures).
async function main() {
  console.log(`Preparing vitest database at ${env.DATABASE_URL}`);
  await resetPostgresSchema(env.DATABASE_URL!);
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
