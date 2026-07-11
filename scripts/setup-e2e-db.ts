import { config } from "dotenv";
import { execSync } from "node:child_process";
import path from "node:path";

config({ path: path.resolve(__dirname, "../.env.test") });

const env = { ...process.env };

console.log(`Preparing e2e test database at ${env.DATABASE_URL}`);
execSync("npx prisma migrate deploy", { stdio: "inherit", env });
execSync("npx prisma db seed", { stdio: "inherit", env });
