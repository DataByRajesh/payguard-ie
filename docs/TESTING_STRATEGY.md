# Testing Strategy

Three layers, each targeting a different class of bug, against **three isolated Postgres databases** inside the same local Docker Compose instance (see [LOCAL_POSTGRES_SETUP.md](LOCAL_POSTGRES_SETUP.md)) so no test suite ever touches another suite's data — or the interactive dev database.

| Database | Used by | Provisioned by |
| --- | --- | --- |
| `payguard_dev` | `pnpm dev`, manual testing, `pnpm demo:reset` | `pnpm db:migrate` / `db:seed` |
| `payguard_vitest` | Vitest (unit + service-integration) | `scripts/setup-vitest-db.ts` (the `pretest` script) |
| `payguard_test` | Playwright | `scripts/setup-e2e-db.ts` (the `pretest:e2e` script) |

All three setup scripts follow the same idiom: drop and recreate the `public` schema (`scripts/reset-postgres-schema.ts`) and run `prisma migrate deploy` fresh, so every test run starts from a clean, migrated schema regardless of what a previous run left behind. The `.env.vitest`/`.env.test` files they load are gitignored, optional local overrides — on a fresh clone, `DATABASE_URL` falls back to the local Postgres connection strings above rather than silently inheriting `.env`'s dev-database connection string.

## Unit tests (Vitest, `lib/**/*.test.ts`)

Pure-function tests against the domain layers — no database, no mocking, `environment: "node"` (`vitest.config.ts`). This is deliberately most of the test suite by count: every reconciliation rule (positive/negative/boundary/missing-data cases), the dedupe fingerprint and run-summary aggregation, the full exception-workflow domain layer (state machine transitions, SLA state calculation, resolution/approval/rejection readiness, UAT release recommendation), currency formatting/rounding, and status-badge presentation coverage for every enum value. Fixed timestamps are always passed in explicitly (never `new Date()` inside the function under test) so these tests are deterministic and fast — hundreds of cases run in milliseconds with zero setup, per the architecture decision in [ARCHITECTURE.md](ARCHITECTURE.md).

## Service-layer integration tests (Vitest, `lib/exception-workflow/service.test.ts`)

The one place Vitest talks to a real database (`payguard_vitest`) rather than mocking Prisma — because the behaviour under test (optimistic-concurrency conflicts on `version`, transactional audit-event writes, the full assign→investigate→root-cause→resolve→evidence→approve path producing a real audit trail, reviewer-separation/evidence/root-cause validation, reject-and-reopen) only actually exists at the Prisma boundary; mocking Prisma here would just be re-testing the mock.

## End-to-end tests (Playwright, `tests/e2e/*.spec.ts`)

Full-browser journeys against a prebuilt `next start` server (`playwright.config.ts`) on a dedicated port (3100) and the `payguard_test` database:

- `smoke.spec.ts` — dashboard navigation, payments list + status filter round-trip, payment detail navigation, settlements list rendering.
- `reconciliation.spec.ts` — run reconciliation, open the run detail, follow a result to its linked exception, re-run and confirm no duplicate open exceptions, exceptions-list filtering.
- `exception-lifecycle.spec.ts` — the full assign → investigate → note → root cause → evidence → resolve → independent-user approval journey with an audit-trail assertion, plus a separate resolve-then-reject journey and exceptions-list status/unassigned filtering.
- `uat.spec.ts` — record a failed execution, link it to an existing exception, attach evidence, follow the link through to the exception detail page, UAT summary tiles.

**Why a prebuilt server, not `next dev`:** Server Action calls against `next dev` were observed to hang intermittently on this stack (Next.js 16 / React 19), independent of invocation pattern; a prebuilt `next start` server serves every route pre-compiled and avoids Turbopack's on-demand first-request compile delay. `retries: 2` (both suite-level and, for the longest Sprint 3 journeys, an additional per-step retry) is the pragmatic mitigation for occasional Chromium process crashes observed on a heavily-loaded shared sandbox during development — confirmed by 100%-reliable results from the equivalent Vitest integration tests and interactive manual verification of the identical flows, i.e. not an application or test defect. Investigating this flakiness surfaced two real fixes that shipped regardless: `useActionState` + native `<form action>` binding was replaced everywhere with the `useTransition` pattern (`lib/hooks/useWorkflowActionState.ts`), and nav links set `prefetch={false}` (`components/layout/NavLink.tsx`) since every page here is dynamic (cookie-dependent) and background prefetches were starving genuine in-flight requests under load.

## What's deliberately not covered

- No visual regression testing (screenshot diffing) — out of scope for a portfolio project at this scale.
- No load/performance testing — see the "no pagination" limitation in [RECONCILIATION_RULES.md#known-limitations-engine-wide](RECONCILIATION_RULES.md#known-limitations-engine-wide).
- The `/reports` exports ([SPRINT4_SUMMARY.md](../SPRINT4_SUMMARY.md)) and demo-reset script are covered indirectly (they read through the same query/service layers the other tests exercise) rather than with dedicated specs, since they add a formatting layer over already-tested data, not new business logic.

## Running everything

```bash
pnpm lint        # ESLint
pnpm typecheck   # tsc --noEmit
pnpm test        # Vitest unit + service-integration (pretest provisions payguard_vitest)
pnpm test:e2e    # Playwright (pretest:e2e provisions payguard_test, builds, and starts the server)
```

All four are run before every sprint's work is considered complete; see the per-sprint summaries (e.g. [SPRINT1_SUMMARY.md](../SPRINT1_SUMMARY.md)) for the "verification" record at the point each sprint was delivered.
