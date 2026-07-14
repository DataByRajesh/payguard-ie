import { test, expect, type Locator, type Page } from "@playwright/test";
import { loginAsEmail } from "./fixtures/auth";

// Matches auth.setup.ts's storageState identity (the default logged-in user for every spec) and
// a second seeded user, both OPS_ANALYST, to demonstrate the "approver must differ from resolver"
// rule -- previously done by switching the now-removed acting-user selector.
const RESOLVER_NAME = "Aisling Byrne";
const OTHER_APPROVER_EMAIL = "conor.walsh@payguard-ie.example";

/**
 * Drives the full Sprint 3 exception lifecycle through the real UI: assign, investigate, add a
 * note, record a root cause, attach evidence, submit a resolution, then have a *different*
 * logged-in user approve and close it — asserting the audit trail records every step.
 *
 * Server Action calls against the prebuilt server have been observed to occasionally hang on this
 * stack, independent of which React invocation pattern is used (confirmed absent under `next dev`
 * in manual testing, and never reproduced in the equivalent Vitest service-layer integration
 * tests — see lib/exception-workflow/service.test.ts). `submitAndAwaitStatus` below retries just
 * the click (reloading and re-filling the form first) rather than paying for a whole-test retry.
 * Since the Cloud Phase 1A migration to Postgres-over-Docker (see docs/LOCAL_POSTGRES_SETUP.md),
 * this has been somewhat more frequent than under SQLite's in-process, zero-latency writes —
 * timeouts below are sized with that extra margin.
 */
async function submitAndAwaitStatus(
  page: Page,
  detailUrl: string,
  fillForm: () => Promise<void>,
  getButton: () => Locator,
  statusPattern: RegExp,
) {
  const statusLocator = page.locator('p[role="status"]', { hasText: statusPattern });
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (attempt > 1) {
      // A hung request from a previous attempt may have actually succeeded server-side: some
      // buttons relabel on success ("Assign" -> "Reassign", matched by pattern above) and some
      // disappear entirely once the case has moved past the status that shows them. Wait (don't
      // just snapshot with .count(), which could race the post-reload render) for the button we're
      // about to click to actually appear; if it never does, the case already advanced — treat
      // that as success rather than failing to find something the UI has legitimately removed.
      const buttonReappeared = await getButton()
        .waitFor({ state: "visible", timeout: 5000 })
        .then(() => true)
        .catch(() => false);
      if (!buttonReappeared) return;
    }
    try {
      await fillForm();
      await getButton().click({ timeout: 20000 });
      await expect(statusLocator).toBeVisible({ timeout: 20000 });
      return;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.goto(detailUrl);
    }
  }
}

test("full exception lifecycle: assign through independent approval, with a complete audit trail", async ({ page }) => {
  test.setTimeout(200000);
  await page.goto("/exceptions?status=NEW&unassigned=true");
  const table = page.getByRole("table", { name: "Exceptions" });
  await expect(table).toBeVisible({ timeout: 20000 });
  const firstRow = table.locator("tbody tr").first();
  const caseReference = await firstRow.locator("a").first().innerText();
  await firstRow.locator("a").first().click();
  await expect(page).toHaveURL(/\/exceptions\/[^/]+$/);
  await expect(page.getByRole("heading", { name: caseReference })).toBeVisible({ timeout: 20000 });
  const detailUrl = page.url();

  // The resolver is the default logged-in user set up by auth.setup.ts's storageState.
  const resolverPlainName = RESOLVER_NAME;

  // Assign.
  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.getByLabel("Assign to").selectOption({ label: resolverPlainName });
    },
    () => page.getByRole("button", { name: /^(Assign|Reassign)$/ }),
    /Assigned to/i,
  );
  await page.goto(detailUrl);

  // Start investigation.
  await submitAndAwaitStatus(page, detailUrl, async () => {},
    () => page.getByRole("button", { name: "Start investigation" }),
    /Investigation started/i,
  );
  await page.goto(detailUrl);

  // Add an investigation note.
  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.getByPlaceholder("Add an investigation note…").fill("Reviewed the payment and settlement records side by side.");
    },
    () => page.getByRole("button", { name: "Add note" }),
    /Note added/i,
  );
  await page.goto(detailUrl);
  // A retried-but-actually-succeeded submission can add this note twice (the "Add note" button,
  // unlike "Start investigation", never disappears — see submitAndAwaitStatus above) — tolerate it.
  await expect(
    page.getByText("Reviewed the payment and settlement records side by side.").first(),
  ).toBeVisible({ timeout: 20000 });

  // Record a root cause.
  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.locator("#rootCauseCategory").selectOption("SETTLEMENT_FILE_MISSING");
      await page
        .getByPlaceholder("Describe the root cause in enough detail for someone else to understand it…")
        .fill("The settlement provider's batch file for this cycle never arrived.");
    },
    () => page.getByRole("button", { name: /^(Record root cause|Update root cause)$/ }),
    /Root cause recorded/i,
  );
  await page.goto(detailUrl);

  // Submit a resolution (requires the root cause + owner just set above).
  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.locator("#resolutionAction").selectOption("CORRECTIVE_SETTLEMENT_APPLIED");
      await page.getByPlaceholder("Describe what was done to resolve this exception…").fill("Requested and applied a replacement settlement file.");
    },
    () => page.getByRole("button", { name: "Submit resolution" }),
    /Resolution submitted/i,
  );
  await page.goto(detailUrl);

  // Approval requires independent review — attempting to approve as the resolver should be blocked.
  await expect(page.getByText("Log in as a different demo user")).toBeVisible({ timeout: 20000 });

  // Attach evidence (required before the case can be closed).
  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.locator("#evidenceType").selectOption("QUERY_RESULT");
      await page.getByLabel("Title").fill("Replacement settlement file confirmation");
    },
    () => page.getByRole("button", { name: "Add evidence" }),
    /Evidence added/i,
  );
  await page.goto(detailUrl);

  // Log in as a different seeded user than the resolver, then approve and close.
  await loginAsEmail(page, OTHER_APPROVER_EMAIL);
  await page.goto(detailUrl);

  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.getByPlaceholder("Approval / rejection note (optional)").fill("Confirmed the replacement file resolves the discrepancy.");
    },
    () => page.getByRole("button", { name: "Approve & close" }),
    /approved and closed/i,
  );
  await page.goto(detailUrl);

  await expect(page.getByText("Closed", { exact: true }).first()).toBeVisible({ timeout: 20000 });

  // The audit timeline should record every step of the journey, in order. Scope to the <section>
  // containing the heading (not just its immediate parent <header>, which the Card component
  // renders as a sibling of the content div — a plain `.locator("..")` from the heading text only
  // ever captures "Audit timeline" itself, never the event list below it).
  const timeline = page.locator("section", { has: page.getByRole("heading", { name: "Audit timeline" }) });
  const timelineText = await timeline.textContent();
  const expectedFragments = [
    "Assigned to",
    "started investigation",
    "added a investigation note",
    "recorded the root cause",
    "submitted a resolution",
    "added evidence",
    "approved and closed the case",
  ];
  for (const fragment of expectedFragments) {
    expect(timelineText?.toLowerCase()).toContain(fragment.toLowerCase());
  }
});

test("rejecting a resolution reopens the case for further investigation", async ({ page }) => {
  test.setTimeout(200000);
  await page.goto("/exceptions?status=NEW&unassigned=true");
  const table = page.getByRole("table", { name: "Exceptions" });
  const rows = table.locator("tbody tr");
  expect(await rows.count()).toBeGreaterThan(1);
  await rows.nth(1).locator("a").first().click();
  await expect(page).toHaveURL(/\/exceptions\/[^/]+$/);
  const detailUrl = page.url();

  const resolverPlainName = RESOLVER_NAME;

  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.getByLabel("Assign to").selectOption({ label: resolverPlainName });
    },
    () => page.getByRole("button", { name: /^(Assign|Reassign)$/ }),
    /Assigned to/i,
  );
  await page.goto(detailUrl);

  await submitAndAwaitStatus(page, detailUrl, async () => {},
    () => page.getByRole("button", { name: "Start investigation" }),
    /Investigation started/i,
  );
  await page.goto(detailUrl);

  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.locator("#rootCauseCategory").selectOption("UPSTREAM_PROVIDER_DELAY");
      await page
        .getByPlaceholder("Describe the root cause in enough detail for someone else to understand it…")
        .fill("Provider confirmed a one-off delay in their overnight batch.");
    },
    () => page.getByRole("button", { name: /^(Record root cause|Update root cause)$/ }),
    /Root cause recorded/i,
  );
  await page.goto(detailUrl);

  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.locator("#resolutionAction").selectOption("UPSTREAM_PROVIDER_CONFIRMED");
      await page.getByPlaceholder("Describe what was done to resolve this exception…").fill("Provider confirmed a one-off delay; no corrective action needed.");
    },
    () => page.getByRole("button", { name: "Submit resolution" }),
    /Resolution submitted/i,
  );
  await page.goto(detailUrl);

  await loginAsEmail(page, OTHER_APPROVER_EMAIL);
  await page.goto(detailUrl);

  await submitAndAwaitStatus(
    page,
    detailUrl,
    async () => {
      await page.getByPlaceholder("Approval / rejection note (optional)").fill("Please get written confirmation from the provider first.");
    },
    () => page.getByRole("button", { name: "Reject" }),
    /returned to investigation/i,
  );
  await page.goto(detailUrl);

  await expect(page.getByText("Investigating", { exact: true }).first()).toBeVisible({ timeout: 20000 });
});

test("exceptions list filters by status and unassigned ownership", async ({ page }) => {
  await page.goto("/exceptions");
  const table = page.getByRole("table", { name: "Exceptions" });
  await expect(table).toBeVisible({ timeout: 20000 });

  await page.getByLabel("Status").selectOption("CLOSED");
  await expect(page).toHaveURL(/status=CLOSED/);
  await page.waitForLoadState("networkidle");
  const closedRows = table.locator("tbody tr");
  const closedCount = await closedRows.count();
  if (closedCount > 0) {
    for (let i = 0; i < closedCount; i++) {
      await expect(closedRows.nth(i)).toContainText("Closed");
    }
  }

  await page.goto("/exceptions");
  await page.getByLabel("Unassigned only").check();
  await expect(page).toHaveURL(/unassigned=true/);
  await page.waitForLoadState("networkidle");
  const unassignedRows = table.locator("tbody tr");
  const unassignedCount = await unassignedRows.count();
  expect(unassignedCount).toBeGreaterThan(0);
  for (let i = 0; i < unassignedCount; i++) {
    await expect(unassignedRows.nth(i)).toContainText("Unassigned");
  }
});
