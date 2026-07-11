import { config } from "dotenv";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env") });

// Demo mode resets ONLY this project's own local SQLite file — never anything outside
// prisma/dev.db. Safe to run repeatedly: always produces the same deterministic dataset.
const env = { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? "file:./prisma/dev.db" };

const devDbPath = path.resolve(__dirname, "../prisma/dev.db");
for (const suffix of ["", "-journal", "-wal", "-shm"]) {
  const filePath = `${devDbPath}${suffix}`;
  if (existsSync(filePath)) rmSync(filePath);
}

console.log(`Resetting demo database at ${env.DATABASE_URL}`);
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });
console.log("\nDemo data ready — run `npm run dev` and open http://localhost:3000");
