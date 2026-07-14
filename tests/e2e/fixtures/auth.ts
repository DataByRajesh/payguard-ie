import type { Page } from "@playwright/test";

/**
 * Logs in as a different seeded user via the real login form -- used mid-test to demonstrate the
 * "approver must differ from resolver" rule (previously done by switching the now-removed
 * acting-user selector). Submitting the form while already logged in (as every spec is, via
 * auth.setup.ts's storageState) simply overwrites the session cookie with the new user's.
 *
 * Deliberately does NOT mint a session cookie directly (bypassing the login form): the generated
 * Prisma client (app/generated/prisma/client) is ESM-only and can't be imported into Playwright
 * test files, which run under Playwright's own CommonJS transform -- see the SyntaxError this
 * produced when first attempted (`Cannot use 'import.meta' outside a module`).
 */
export async function loginAsEmail(page: Page, email: string): Promise<void> {
  const password = process.env.SEED_USER_PASSWORD ?? "payguard-demo";
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/dashboard$/, { timeout: 20000 });
}
