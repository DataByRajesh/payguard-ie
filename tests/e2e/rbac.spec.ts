import { test, expect } from "@playwright/test";
import { loginAsEmail } from "./fixtures/auth";

// Niamh Doyle is a seeded UAT_LEAD (prisma/seed.ts) -- a role with no exception-assignment
// permission (lib/auth/permissions.ts). Assigning is rejected server-side with no mutation, so
// this test never needs its own dedicated fixture row.
test("a role without exception-assignment permission is rejected, not just unauthenticated", async ({ page }) => {
  await loginAsEmail(page, "niamh.doyle@payguard-ie.example");

  await page.goto("/exceptions?status=NEW&unassigned=true");
  const table = page.getByRole("table", { name: "Exceptions" });
  await expect(table).toBeVisible({ timeout: 20000 });
  await table.locator("tbody tr").first().locator("a").first().click();
  await expect(page).toHaveURL(/\/exceptions\/[^/]+$/);

  await page.getByLabel("Assign to").selectOption({ index: 1 });
  await page.getByRole("button", { name: "Assign" }).click();

  await expect(page.getByText("Your role does not have permission to perform this action.")).toBeVisible({ timeout: 20000 });
});
