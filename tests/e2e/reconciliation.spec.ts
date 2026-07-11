import { test, expect } from "@playwright/test";

test("running reconciliation, drilling into a result/exception, and re-running is idempotent", async ({ page }) => {
  await page.goto("/reconciliation");
  await expect(page.getByRole("heading", { name: "Reconciliation" })).toBeVisible();

  // The seed database already ran reconciliation once; this is a second, manually-triggered run.
  await page.getByRole("button", { name: "Run reconciliation" }).click();
  await expect(page.locator('p[role="status"]')).toContainText(/completed:/i, { timeout: 15000 });
  await page.waitForLoadState("networkidle");

  const runsTable = page.getByRole("table", { name: "Reconciliation runs" });
  await expect(runsTable).toBeVisible();
  const rowCountAfterSecondRun = await runsTable.locator("tbody tr").count();
  expect(rowCountAfterSecondRun).toBeGreaterThanOrEqual(2);

  // Open the most recent run.
  const latestRunLink = runsTable.locator("tbody tr").first().locator("a").first();
  await latestRunLink.click();
  await expect(page).toHaveURL(/\/reconciliation\/[^/]+$/);
  const statusField = page.locator("dt", { hasText: "Status" }).first().locator("xpath=following-sibling::dd[1]");
  await expect(statusField).toContainText("Completed");

  const resultsTable = page.getByRole("table", { name: "Reconciliation results" });
  await expect(resultsTable).toBeVisible();
  expect(await resultsTable.locator("tbody tr").count()).toBeGreaterThan(0);

  // Navigate to a linked exception from this run's results.
  const exceptionLink = resultsTable.locator("tbody tr a", { hasText: /^EXC-/ }).first();
  await expect(exceptionLink).toBeVisible();
  const exceptionReference = await exceptionLink.innerText();
  await exceptionLink.click();
  await expect(page).toHaveURL(/\/exceptions\/[^/]+$/);
  await expect(page.getByRole("heading", { name: exceptionReference })).toBeVisible();
  await expect(page.getByText("Exception summary")).toBeVisible();

  // Run reconciliation a third time with nothing changed in between: no new exceptions should be created.
  await page.goto("/reconciliation");
  await page.getByRole("button", { name: "Run reconciliation" }).click();
  await expect(page.locator('p[role="status"]')).toContainText(/0 new exceptions/i, { timeout: 15000 });
});

test("exceptions list renders rows and filters by severity", async ({ page }) => {
  await page.goto("/exceptions");
  const table = page.getByRole("table", { name: "Exceptions" });
  await expect(table).toBeVisible();
  const initialRowCount = await table.locator("tbody tr").count();
  expect(initialRowCount).toBeGreaterThan(0);

  await page.getByLabel("Severity").selectOption("CRITICAL");
  await expect(page).toHaveURL(/severity=CRITICAL/);
  await page.waitForLoadState("networkidle");
  await expect(table).toBeVisible();
  const rows = table.locator("tbody tr");
  const rowCount = await rows.count();
  expect(rowCount).toBeGreaterThan(0);
  for (let i = 0; i < rowCount; i++) {
    await expect(rows.nth(i)).toContainText("Critical");
  }
});
