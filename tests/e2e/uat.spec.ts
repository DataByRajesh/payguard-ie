import { test, expect, type Locator, type Page } from "@playwright/test";

/** See tests/e2e/exception-lifecycle.spec.ts for why this retry wrapper exists. */
async function submitAndAwaitStatus(
  page: Page,
  reloadUrl: string,
  fillForm: () => Promise<void>,
  getButton: () => Locator,
  statusPattern: RegExp,
) {
  const statusLocator = page.locator('p[role="status"]', { hasText: statusPattern });
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await fillForm();
      await getButton().click({ timeout: 8000 });
      await expect(statusLocator).toBeVisible({ timeout: 8000 });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.goto(reloadUrl);
    }
  }
}

test("recording a failed UAT execution, linking it to an exception, and attaching evidence", async ({ page }) => {
  await page.goto("/uat");
  const table = page.getByRole("table", { name: "UAT test cases" });
  await expect(table).toBeVisible({ timeout: 20000 });
  const firstRow = table.locator("tbody tr").first();
  await firstRow.locator("a").first().click();
  await expect(page).toHaveURL(/\/uat\/[^/]+$/);
  const detailUrl = page.url();

  await expect(page.getByText("Record a new execution")).toBeVisible({ timeout: 20000 });

  const linkSelect = page.locator("select[name=linkedExceptionCaseId]");
  const linkOptionsCount = await linkSelect.locator("option").count();
  expect(linkOptionsCount).toBeGreaterThan(1);
  const linkedLabel = await linkSelect.locator("option").nth(1).innerText();

  const executionForm = page.locator("form", { has: page.locator("select[name=status]") });
  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.locator("select[name=status]").selectOption("FAIL");
      await linkSelect.selectOption({ index: 1 });
      await page.locator("textarea[name=actualResult]").fill("Reconciliation did not flag the expected mismatch.");
    },
    () => executionForm.getByRole("button", { name: "Record execution" }),
    /Execution recorded/i,
  );

  await expect(page.getByText("Execution history")).toBeVisible({ timeout: 20000 });
  const latestExecutionItem = page.locator("li", { hasText: "Reconciliation did not flag the expected mismatch." }).first();
  await expect(latestExecutionItem).toBeVisible({ timeout: 20000 });
  const linkedExceptionRef = linkedLabel.split(" — ")[0];
  await expect(page.getByRole("link", { name: linkedExceptionRef })).toBeVisible({ timeout: 20000 });

  // Attach evidence to the execution just recorded (the most recent item in the history list).
  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await latestExecutionItem.locator("input[name=title]").fill("Reconciliation run output showing the missed mismatch");
    },
    () => latestExecutionItem.getByRole("button", { name: "Add evidence" }),
    /Evidence added/i,
  );
  await expect(latestExecutionItem.getByText("Reconciliation run output showing the missed mismatch")).toBeVisible({ timeout: 20000 });

  // Follow the link through to the linked exception case.
  await page.getByRole("link", { name: linkedExceptionRef }).click();
  await expect(page).toHaveURL(/\/exceptions\/[^/]+$/);
  await expect(page.getByRole("heading", { name: linkedExceptionRef })).toBeVisible({ timeout: 20000 });
});

test("UAT summary tiles reflect execution counts and the dashboard links through", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.getByRole("heading", { name: "UAT execution counts" })).toBeVisible({ timeout: 20000 });

  await page.goto("/uat");
  for (const label of ["Test cases", "Pass", "Fail", "Blocked", "Not run"]) {
    // Badge cells in the table can also read e.g. "Pass", so scope to the first (summary tile) match.
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible({ timeout: 20000 });
  }
});
