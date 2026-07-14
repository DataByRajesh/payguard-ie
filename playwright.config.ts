import { defineConfig, devices } from "@playwright/test";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import { AUTH_FILE } from "./tests/e2e/auth-storage-state";

loadEnv({ path: path.resolve(__dirname, ".env.test") });

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  // Server Action calls against the prebuilt `next start` server have been observed to hang
  // intermittently on this stack (Next.js 16 / React 19), independent of invocation pattern —
  // confirmed absent under `next dev`, but `next dev` has its own on-demand-compile flakiness
  // (see the webServer command below). Retrying is the pragmatic mitigation for either class.
  retries: 2,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    // A prebuilt server serves every route pre-compiled, avoiding Turbopack's
    // on-demand first-request compile delay that made `next dev` flaky here.
    command: `npx next build && npx next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: {
      DATABASE_URL: process.env.DATABASE_URL ?? "postgresql://payguard:payguard@localhost:5432/payguard_test",
    },
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_FILE },
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/,
    },
  ],
});
