# UAT Workflow

This document describes the Sprint 3 user-acceptance-test workspace (`lib/uat-workflow/`, `/uat`, `/uat/[id]`).

## Test cases and executions

A `UATTestCase` is a fixed, seeded specification: a reference (`testCaseRef`), title, description, optional `requirementReference`, preconditions, steps, expected result, and an area (e.g. "Payments", "Exceptions", "Reconciliation", "UAT"). Test cases are not created through the UI in this sprint — they represent a maintained test plan.

A `UATExecution` is a single recorded run of a test case against the application, created via `executeUatCase()` (`lib/uat-workflow/service.ts`):

- **Status** — one of four (`UAT_STATUSES`): `NOT_RUN`, `PASS`, `FAIL`, `BLOCKED`. Note the exact vocabulary is `PASS`/`FAIL`, not `PASSED`/`FAILED`.
- **Actual result** and **notes** — free text; notes are the natural place to record *why* an execution is `BLOCKED` (e.g. an environment issue unrelated to the feature under test).
- **Tester** — attributed to the currently logged-in user (`lib/acting-user.ts`, Cloud Phase 2.1 signed-session identity), the same mechanism used throughout the app.
- A test case can be executed any number of times — `/uat/[id]` shows the full execution history for a test case, most recent first, not just the latest result.

## Manual-only exception linking — the one rule that matters most in this doc

**A failed UAT execution never automatically creates an exception case.** This is an explicit, deliberate design decision from the sprint brief, not an oversight: `executeUatCase()` (`lib/uat-workflow/service.ts`) has a doc comment calling this out directly, and there is no code path anywhere from a `FAIL` execution to `prisma.exceptionCase.create`.

Instead, `linkedExceptionCaseId` is an **optional, manually chosen** field on the execution form (`components/uat/UatExecutionForm.tsx`) — a tester who observes a failure that corresponds to a *known, already-existing* exception case can link the two together for traceability, but the tester (a human) always makes that judgement call. This matters because a UAT failure and a reconciliation exception are conceptually different things — a UAT failure means "the application didn't behave as specified when tested," which might correspond to a genuine data exception, a bug with no data-layer symptom at all, or a test-environment problem — automatically conflating the two would create noise and false positives in the exception queue.

The dropdown offers every non-`CLOSED` exception case (`getLinkableExceptionCases()`, `lib/queries/uat.ts`) — closed cases are excluded since linking to something already resolved wouldn't help anyone investigate.

## Evidence

Like exception cases, UAT executions can have evidence records attached (`addUatEvidence()`) — the same `EvidenceRecord` model, same five types, same real file upload support described in [EXCEPTION_LIFECYCLE.md](EXCEPTION_LIFECYCLE.md#evidence). A screenshot of the actual (failing) behaviour, a log extract, or a query result confirming the expected data state are the intended use.

## Release recommendation

`computeReleaseRecommendation()` (`lib/exception-workflow/uatRecommendation.ts`) is a pure function over aggregate execution counts (pass/fail/blocked/not-run):

| Condition | Recommendation |
| --- | --- |
| Any `FAIL` | `NOT_READY` |
| No fails, but any `BLOCKED` or `NOT_RUN` | `CONDITIONAL` |
| All executed and all `PASS` | `READY` |

Any actual failure is a hard blocker; blocked or not-yet-run cases only downgrade to a conditional recommendation, since they represent unknowns rather than confirmed defects.

## Audit trail

Every execution and every evidence attachment writes an `AuditEvent` (`entityType: "UAT_EXECUTION"`, actions `UAT_EXECUTED` / `UAT_EVIDENCE_ADDED`), same pattern as the exception workflow.

## Seed data

`prisma/seed.ts` seeds ten test cases spanning Payments/Reconciliation/Exceptions/UAT areas with a deterministic mix of executions — pass, fail, blocked, not-run — including one `FAIL` execution manually linked to a real (engine-created) exception case, demonstrating the linking feature end-to-end without ever auto-generating one.

## Known limitations

- Role-based authorization (Cloud Phase 2.2) restricts who may execute test cases (`APP_SUPPORT`/`UAT_LEAD`/`ADMIN`, not `OPS_ANALYST`), but there's no finer-grained scoping beyond that.
- No cycle/release grouping — executions are a flat history per test case, not organised into named test cycles or release sign-offs (out of scope this sprint).
- No coverage reporting linking test cases to specific application features beyond the free-text `area` field.
