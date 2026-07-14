import { config } from "dotenv";
import { execSync } from "node:child_process";
import path from "node:path";
import { resetPostgresSchema } from "./reset-postgres-schema";

config({ path: path.resolve(__dirname, "../.env.test") });

// `.env.test` is a gitignored, optional local override — on a fresh clone it won't exist, and
// without this fallback `env.DATABASE_URL` would be undefined here, silently letting Prisma fall
// back to whatever `.env` points at (the interactive dev database) instead of the disposable one.
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://payguard:payguard@localhost:5432/payguard_test",
};

// The test database is a disposable fixture, never real data — always reset to a clean, migrated
// schema before seeding so tests never have to reconcile against a previous run's rows.
async function main() {
  console.log(`Preparing e2e test database at ${env.DATABASE_URL}`);
  await resetPostgresSchema(env.DATABASE_URL!);
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx prisma db seed", { stdio: "inherit", env });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
