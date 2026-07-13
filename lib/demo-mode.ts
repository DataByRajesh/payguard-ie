/**
 * Public cloud demo safety switch (Cloud Phase 1B). Set `DEMO_READ_ONLY=true` in a deployment's
 * environment variables — Preview and/or Production — to block every data-mutating Server Action
 * while leaving all reads (pages, /reports exports) fully functional. Unset/false everywhere else
 * (local dev, Vitest, Playwright), so this never affects the workflows under test.
 *
 * Deliberately does NOT gate `setActingUserAction` (lib/actions/actingUser.ts) — switching which
 * seeded persona you're viewing as mutates no business data and is part of exploring the read-only
 * demo, not a write workflow this flag is meant to protect.
 */
const DEMO_READ_ONLY_MESSAGE =
  "This is a public read-only demo — write actions are disabled here. Clone the repo and run it locally (see README) to try the full workflow.";

export function isDemoReadOnly(): boolean {
  return process.env.DEMO_READ_ONLY === "true";
}

export function demoReadOnlyResult<R extends { success: boolean; message: string }>(): R {
  return { success: false, message: DEMO_READ_ONLY_MESSAGE } as R;
}
