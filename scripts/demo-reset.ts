import { config } from "dotenv";
import { execSync } from "node:child_process";
import path from "node:path";
import { resetPostgresSchema } from "./reset-postgres-schema";

config({ path: path.resolve(__dirname, "../.env") });

// Demo mode resets ONLY this project's own local Postgres database (payguard_dev, via
// docker-compose.yml) — never anything outside it, and never a Preview/Production database
// (DATABASE_URL here always comes from the local .env, not a cloud environment variable).
// Safe to run repeatedly: always produces the same deterministic dataset.
const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://payguard:payguard@localhost:5432/payguard_dev",
};

async function main() {
  console.log(`Resetting demo database at ${env.DATABASE_URL}`);
  await resetPostgresSchema(env.DATABASE_URL!);
  execSync("npx prisma migrate deploy", { stdio: "inherit", env });
  execSync("npx prisma db seed", { stdio: "inherit", env });
  console.log("\nDemo data ready — run `pnpm dev` and open http://localhost:3000");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
