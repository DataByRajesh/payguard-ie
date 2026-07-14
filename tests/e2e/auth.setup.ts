import { test as setup } from "@playwright/test";
import { AUTH_FILE } from "./auth-storage-state";

/**
 * Runs once (the "setup" project in playwright.config.ts) and drives the real login form for one
 * seeded user (Aisling Byrne, OPS_ANALYST), saving the resulting session cookie so every other
 * spec starts already authenticated as her -- matching the old acting-user fallback's default
 * (first active user, alphabetically) without needing every spec to log in itself.
 */
setup("authenticate as a seeded demo user", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("aisling.byrne@payguard-ie.example");
  await page.getByLabel("Password").fill(process.env.SEED_USER_PASSWORD ?? "payguard-demo");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
  await page.context().storageState({ path: AUTH_FILE });
});
