import { test, expect } from "@playwright/test";

// Every other spec file runs against the pre-authenticated storageState set up by auth.setup.ts
// (see playwright.config.ts) -- this file is the one place that deliberately wants a logged-out
// context for every test, since that's exactly what it's testing.
test.use({ storageState: { cookies: [], origins: [] } });

const SEEDED_EMAIL = "aisling.byrne@payguard-ie.example";
const SEEDED_PASSWORD = process.env.SEED_USER_PASSWORD ?? "payguard-demo";

test("visiting a protected route while logged out redirects to /login", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});

test("logging in with the wrong password is rejected with a clear message", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEEDED_EMAIL);
  await page.getByLabel("Password").fill("definitely-not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible({ timeout: 20000 });
  await expect(page).toHaveURL(/\/login$/);
});

test("logging in with a seeded user's credentials reaches the dashboard, and logout returns to /login", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(SEEDED_EMAIL);
  await page.getByLabel("Password").fill(SEEDED_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/, { timeout: 20000 });

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/, { timeout: 20000 });

  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
});
