import { test, expect } from "@playwright/test";

test("dashboard loads with primary navigation to all sprint pages", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  const nav = page.getByRole("navigation", { name: "Primary" });
  for (const label of ["Payments", "Settlements", "Reconciliation", "Exceptions", "UAT", "Reports", "Settings"]) {
    await expect(nav.getByRole("link", { name: label })).toBeVisible();
  }
});

test("payments list renders rows and a status filter updates the URL and results", async ({ page }) => {
  await page.goto("/payments");
  const table = page.getByRole("table", { name: "Payments" });
  await expect(table).toBeVisible();
  const initialRowCount = await table.locator("tbody tr").count();
  expect(initialRowCount).toBeGreaterThan(0);

  await page.getByLabel("Payment status").selectOption("FAILED");
  await expect(page).toHaveURL(/status=FAILED/);
  await page.waitForLoadState("networkidle");
  await expect(table).toBeVisible();
  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  for (let i = 0; i < rowCount; i++) {
    await expect(rows.nth(i)).toContainText("Failed");
  }
});

test("clicking a payment reference navigates to its detail page", async ({ page }) => {
  await page.goto("/payments");
  const firstReferenceLink = page.getByRole("table", { name: "Payments" }).locator("tbody tr").first().locator("a").first();
  const reference = await firstReferenceLink.innerText();
  await firstReferenceLink.click();

  await expect(page).toHaveURL(/\/payments\/[^/]+$/);
  await expect(page.getByRole("heading", { name: reference })).toBeVisible();
  await expect(page.getByText("Payment summary")).toBeVisible();
  await expect(page.getByText("Settlement", { exact: true })).toBeVisible();
});

test("settlements list renders rows", async ({ page }) => {
  await page.goto("/settlements");
  const table = page.getByRole("table", { name: "Settlements" });
  await expect(table).toBeVisible();
  const rowCount = await table.locator("tbody tr").count();
  expect(rowCount).toBeGreaterThan(0);
});
