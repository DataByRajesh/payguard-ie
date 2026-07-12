# PayGuard IE — Sprint 3 Delivery Summary

**Scope**: the full exception investigation/resolution/approval workflow on top of the Sprint 2 engine's exceptions, plus a sibling UAT (user-acceptance-test) workspace.

## What was built

- **Exception lifecycle** (`lib/exception-workflow/`): `NEW → ASSIGNED → INVESTIGATING ⇄ AWAITING_INFORMATION → RESOLVED → CLOSED`, with rejection returning `RESOLVED → INVESTIGATING`. Direct closure from any earlier status is structurally impossible — every transition is checked against an explicit allow-list. Full state diagram and every business rule (assignment to active users only, five typed note categories, ten-category root-cause analysis, four-part resolution readiness check, independent-reviewer approval requiring at least one evidence record, five-state SLA tracking, optimistic concurrency via a `version` column, a full transactional audit trail): [docs/EXCEPTION_LIFECYCLE.md](docs/EXCEPTION_LIFECYCLE.md).
- **`/exceptions/[id]`**: the full investigation workspace — assignment, notes, root cause, resolution, evidence, approval/rejection, and a chronological audit timeline — replacing the Sprint 2 read-only detail view.
- **UAT workspace** (`lib/uat-workflow/`, `/uat`, `/uat/[id]`): recorded test executions (`NOT_RUN`/`PASS`/`FAIL`/`BLOCKED`) against a fixed, seeded test plan, with a pure release-recommendation function (`READY`/`CONDITIONAL`/`NOT_READY`) over aggregate pass/fail/blocked counts. **A failed execution never automatically creates an exception case** — linking a UAT failure to an existing exception is always a manual, tester-driven choice, an explicit design decision documented in [docs/UAT_WORKFLOW.md](docs/UAT_WORKFLOW.md).
- **Acting-user identity**: `lib/acting-user.ts` and the header's "Acting as" selector (`components/layout/ActingUserSelector.tsx`) — a cookie-backed stand-in for authentication, letting every mutation be attributed to a seeded demo user and letting the "approver must differ from resolver" rule actually be demonstrated locally.
- **Schema growth**: notes, root cause, resolution, approval, evidence, users, and the `ExceptionStatus` lifecycle rewrite (superseding Sprint 1/2's `OPEN`/`IN_PROGRESS` values) — see [docs/DATA_MODEL.md](docs/DATA_MODEL.md).
- **Seed data rewrite**: rather than hand-crafting exception rows in advanced statuses, the seed script drives a representative slice of the same engine-created exceptions through the real service functions (assign → investigate → root cause → resolve → approve/reject) — the same code path a real user's click triggers — producing a realistic spread of demo states (unassigned, assigned, investigating, awaiting-information, resolved-awaiting-approval, closed-on-time, closed-late, forced-overdue, rejected-and-reopened).
- **Playwright coverage** for both new journeys: the full exception lifecycle (assign → investigate → note → root cause → evidence → resolve → independent approval, with an audit-trail assertion) and the UAT record-and-link journey.

## Notable bugs caught and fixed during build (pre-merge review)

1. **Assign-on-closed guard**: assignment was callable at any status except `RESOLVED`, but `CLOSED` wasn't explicitly excluded — fixed to reject assignment on both terminal-adjacent statuses.
2. **Evidence-ref race**: a narrow window where two evidence records could be attached with a colliding reference under concurrent submission — fixed at the persistence layer.
3. **Seed actor consistency**: the seed script's synthetic "acting user" for driving cases through the workflow wasn't always a genuinely different user for the approval step (which would have silently violated the reviewer-separation rule the seed data is meant to demonstrate) — fixed to always pick a distinct approver.

## Verification (all green)

- `npm run lint`, `npm run typecheck`, `npm run build` — clean
- `npm test` — Vitest unit coverage for the full domain layer (state machine, SLA, resolution/approval readiness, UAT recommendation) plus a real-database service-integration suite (`lib/exception-workflow/service.test.ts`) covering optimistic concurrency, transactional audit writes, and the full lifecycle path
- `npm run test:e2e` — the exception-lifecycle and UAT Playwright journeys described above

## Repo state

Delivered on `feature/sprint-3-investigation`, merged to `main` via PR #2 (`e144ca5`) after a pre-merge review pass (`3162900`) addressed the three findings above.
