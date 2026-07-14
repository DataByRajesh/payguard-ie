# PayGuard IE

An internal payments operations, reconciliation, exception-investigation and UAT evidence platform for Irish and European FinTech teams.

- **Sprint 1**: project foundation plus fully functional Payments and Settlements areas.
- **Sprint 2**: a deterministic reconciliation engine — seven rules evaluated against every payment/settlement, stored results, idempotent exception creation, and functional `/reconciliation` (+ run detail) and `/exceptions` (+ case detail) pages.
- **Sprint 3**: the full exception investigation/resolution/approval workflow (assignment, typed notes, root-cause analysis, resolution, independent-review approval/rejection, SLA tracking, evidence, optimistic concurrency, full audit trail) and a UAT workspace (`/uat`, `/uat/[id]`) with manual-only exception linking.
- **Sprint 4**: live `/reports` exports (Markdown/CSV/print-friendly HTML across four report types), a real audit timeline on `/payments/[id]` (retiring the last Sprint 1 placeholder), one-command demo reset (`pnpm demo:reset`), and a full documentation pass.
- **Cloud Phase 1A**: migrated local development from SQLite to PostgreSQL (Docker Compose), switched the package manager to pnpm — local/test/cloud environments now run the same database engine. See [docs/LOCAL_POSTGRES_SETUP.md](docs/LOCAL_POSTGRES_SETUP.md).
- **Cloud Phase 1B**: public Vercel demo deployment — isolated Preview/Production Postgres databases, migrations applied automatically on deploy, and a `DEMO_READ_ONLY` flag that disables every mutating action (including reconciliation execution) for every visitor to the public demo. See [docs/CLOUD_DEPLOYMENT.md](docs/CLOUD_DEPLOYMENT.md).
- **Cloud Phase 2.1**: real authentication — `/login`, signed session cookies, password-protected seeded users, replacing the old free-switch acting-user selector. See [docs/SECURITY_AND_LIMITATIONS.md](docs/SECURITY_AND_LIMITATIONS.md).
- **Cloud Phase 2.2**: role-based authorization — every mutating action now checks the logged-in user's role (`OPS_ANALYST`/`APP_SUPPORT`/`UAT_LEAD`/`ADMIN`), and `/settings` gained real admin-only user management (create, change role, activate/deactivate, reset password).
- **Cloud Phase 2.3**: the audit trail's actor is now a real `User` foreign key, not a free-text name — a migration (`scripts/backfill-audit-actor.ts`) moved existing history across, and a seeded service-account user attributes machine-driven events.
- **Cloud Phase 2.4**: evidence can now be a real uploaded file, not just a text reference — `lib/evidence-storage/` provides a local-filesystem adapter (dev/CI) and a Vercel Blob adapter (the public demo), with a 10MB size cap and MIME allow-list.
- **Cloud Phase 2.5**: every mutating action is now rate-limited per user (`lib/rate-limit.ts`, Postgres-backed so it works correctly across serverless instances) and every server-side error is logged as structured JSON (`lib/logger.ts`) instead of ad hoc `console.error`.
- **Cloud Phase 2.6**: a backup/recovery runbook ([docs/BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md)) and a final documentation consolidation pass across the Cloud Phase 2 program — authentication, authorization, audit-actor identity, evidence storage, and rate limiting/logging.

Per-sprint delivery detail: [SPRINT1_SUMMARY.md](SPRINT1_SUMMARY.md), [SPRINT2_SUMMARY.md](SPRINT2_SUMMARY.md), [SPRINT3_SUMMARY.md](SPRINT3_SUMMARY.md), [SPRINT4_SUMMARY.md](SPRINT4_SUMMARY.md). System-wide docs: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/DATA_MODEL.md](docs/DATA_MODEL.md), [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md), [docs/SECURITY_AND_LIMITATIONS.md](docs/SECURITY_AND_LIMITATIONS.md), [docs/LOCAL_POSTGRES_SETUP.md](docs/LOCAL_POSTGRES_SETUP.md), [docs/CLOUD_DEPLOYMENT.md](docs/CLOUD_DEPLOYMENT.md), [docs/BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md).

Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma + PostgreSQL, Zod, Vitest and Playwright. No AI features, external APIs, or automatic payment submission are implemented.

## Requirements

- Node.js 20.9+ (Next.js 16 minimum)
- pnpm
- Docker (for local Postgres)

## Setup

```bash
pnpm install
cp .env.example .env
pnpm db:local:start   # starts local Postgres via Docker Compose
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/login`. Every seeded user shares one password (`SEED_USER_PASSWORD`, default `payguard-demo` locally); the login page lists every seeded email/role so you can sign in as any of them.

## Database

This project uses Prisma against PostgreSQL — locally via Docker Compose (`docker-compose.yml`), in the cloud via a managed Postgres provider (Phase 1B). Prisma Client is generated into `app/generated/prisma` and accessed via a `@prisma/adapter-pg` driver adapter (`lib/db.ts`), per Prisma 7's driver-adapter-based client generation. Full setup, database layout and troubleshooting: **[docs/LOCAL_POSTGRES_SETUP.md](docs/LOCAL_POSTGRES_SETUP.md)**.

- `pnpm db:local:start` / `pnpm db:local:stop` — start/stop the local Postgres container
- `pnpm db:migrate` — apply schema migrations to your local dev database (`payguard_dev`)
- `pnpm db:seed` — (re)seed the database with ~50 synthetic payments covering every reconciliation scenario (matched, missing settlement, amount/currency mismatch, duplicate payment, delayed settlement, stuck/pending, invalid status combination, failed payment), plus settlements, UAT test cases/executions/evidence, and 11 users (2 deliberately inactive, to demonstrate that inactive users can't be assigned). The seed script then runs the **real reconciliation engine** against that data (the same code path the UI's "Run reconciliation" button calls), so the resulting `ReconciliationRun`, `ReconciliationResult` and `ExceptionCase` rows are genuinely engine-generated, not hand-authored. A representative slice of those exceptions is then driven through the real Sprint 3 workflow service functions (assign → investigate → root cause → resolve → approve/reject) to produce every required demo scenario — see [docs/EXCEPTION_LIFECYCLE.md](docs/EXCEPTION_LIFECYCLE.md#seed-data). Not idempotent against existing data — reset first if re-running against a non-empty database.
- `pnpm db:reset` — drop and recreate the database from scratch, then re-seed
- `pnpm db:studio` — open Prisma Studio to browse the data

Connection string lives in `.env` (`DATABASE_URL="postgresql://payguard:payguard@localhost:5432/payguard_dev"`). See `.env.example`, `.env.local.example`, `.env.test.example` and `.env.production.example` for the per-environment templates. `prisma.config.ts` is Prisma 7's config file (schema/migration paths, seed command); it replaces the datasource `url` that used to live directly in `schema.prisma`.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm db:local:start` / `pnpm db:local:stop` | Start/stop local Postgres (Docker Compose) |
| `pnpm test` | Run Vitest unit + integration tests once (provisions a disposable `payguard_vitest` database first via the `pretest` script) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm test:e2e` | Run the Playwright smoke suite against a prebuilt server and a separate `payguard_test` database (auto-migrated and seeded first) |
| `pnpm demo:reset` | Wipe and re-seed `payguard_dev` back to the same deterministic demo dataset — safe to run any time, including after clicking around and mutating data |
| `pnpm db:backup` | Manual `pg_dump` snapshot to a gitignored `./backups/` directory — see [docs/BACKUP_AND_RECOVERY.md](docs/BACKUP_AND_RECOVERY.md) |

## Architecture notes

- **Money** is stored as integer minor units (`amountMinor`, e.g. cents), never floats, to avoid rounding errors — a standard payments-industry pattern. `lib/money.ts` formats/parses between minor units and display strings.
- **Settlement status shown on the Payments/Settlements pages is derived live**, not read from a stored snapshot: `lib/reconciliation.ts#deriveSettlementDisplayStatus` compares the current `Payment` and `Settlement` records on every read. This is unrelated to (and unchanged by) the Sprint 2 reconciliation engine below — it's a fast, always-fresh preview used for list-page badges, independent of whether a reconciliation run has ever executed.
- **Currency and payment method** are plain validated strings (`lib/constants.ts`), not Prisma enums — enums are reserved for the domain statuses the spec calls out explicitly.
- Filters on `/payments`, `/settlements` and `/exceptions` are plain server-rendered `<form method="GET">`s validated with Zod (`lib/validation/`) — no client-side table state, fully functional without JavaScript.
- `lib/queries/` is the only layer that talks to Prisma for reads; pages and components never import `lib/db` directly.

## Reconciliation engine (Sprint 2)

A deterministic engine (`lib/reconciliation-engine/`) evaluates seven rules against every payment on each run, in four layers:

1. **Pure domain rules** — `rules/*.ts`, `config.ts`, `dedupe.ts`, `types.ts`, `summary.ts`. Zero imports of Prisma/React/Next/Node — every rule is `(context) => RuleEvaluation`, fully unit-tested with fixed timestamps.
2. **Orchestration** — `service.ts#runReconciliation()`. Loads data, runs every rule against every payment, persists results, marks the run completed/failed, returns a typed summary. Never touches Prisma directly.
3. **Persistence** — `persistence.ts`. All reads/writes for runs, results and idempotent exception creation.
4. **UI/server action** — `lib/actions/reconciliation.ts#runReconciliationAction` (a Server Action, triggered by the "Run reconciliation" button on `/reconciliation`) plus `lib/queries/reconciliation.ts` and `lib/queries/exceptions.ts` for reads.

**The seven rules**: missing settlement, amount mismatch, currency mismatch, duplicate payment, delayed settlement, stuck (pending) payment, invalid status combination. Full business-purpose/trigger/severity/limitations documentation for each: **[docs/RECONCILIATION_RULES.md](docs/RECONCILIATION_RULES.md)**.

**Duplicate-payment fingerprint**: since this schema has no merchant-supplied idempotency key, duplicates are detected via `(customerId, amountMinor, currency, paymentMethod)` within a configurable time window — a documented heuristic, not a guarantee (see the doc above for false-positive/negative scenarios).

**Idempotency**: re-running reconciliation against unchanged data never creates duplicate open exceptions. Each failed rule evaluation computes a deterministic dedupe key; an existing *open* (non-resolved/closed) exception with that key gets the new result linked and its `lastDetectedAt` bumped instead of a new row. Full detail in the docs page above.

**Local workflow**: `pnpm dev`, open `/reconciliation`, click "Run reconciliation". The run summary, run history, and a full results table (with links to the underlying payment, settlement and any generated exception) update immediately. `/exceptions` is a filterable queue (type/severity/status/SLA state/payment reference) with a detail page showing the triggering reconciliation result, audit timeline, comments and evidence.

**Known limitations**: no pagination (loads all payments per run — fine at this project's scale), sequential (not batched) persistence writes. Full list in `docs/RECONCILIATION_RULES.md`.

## Exception workflow and UAT (Sprint 3)

The exceptions an engine run creates are no longer read-only: `/exceptions/[id]` is a full investigation workspace built from the same four-layer architecture as the engine above (`lib/exception-workflow/{types,config,stateMachine,sla,resolution,approval}.ts` pure domain logic → `service.ts` orchestration → `persistence.ts` → `lib/actions/exceptions.ts` Server Actions → UI cards).

- **Lifecycle**: `NEW → ASSIGNED → INVESTIGATING ⇄ AWAITING_INFORMATION → RESOLVED → CLOSED`, with rejection returning `RESOLVED → INVESTIGATING`. Direct closure from any earlier status is structurally impossible — every transition is checked against an explicit allow-list. Full state diagram and every rule (assignment, notes, root cause, resolution readiness, independent-review approval, SLA states, evidence, optimistic concurrency, audit trail): **[docs/EXCEPTION_LIFECYCLE.md](docs/EXCEPTION_LIFECYCLE.md)**.
- **Identity**: every mutation is attributed to whoever is currently logged in (Cloud Phase 2.1 — see [docs/SECURITY_AND_LIMITATIONS.md](docs/SECURITY_AND_LIMITATIONS.md)). To demonstrate the "approver must differ from resolver" rule locally, submit a resolution as one seeded user, log out, then log back in as a different one before approving.
- **Optimistic concurrency**: every exception case carries a `version` column. Every mutating form embeds the version it was loaded with; a second, stale submission (someone else changed it first) is rejected with a clear "reload and try again" message rather than silently overwriting.
- **UAT workspace**: `/uat` (queue with pass/fail/blocked/not-run summary tiles) and `/uat/[id]` (test case detail, execution history, new-execution form). A failed execution **never** automatically creates an exception case — linking a UAT failure to an existing exception is always a manual, tester-driven choice. Full detail: **[docs/UAT_WORKFLOW.md](docs/UAT_WORKFLOW.md)**.
- **Dashboard** now reflects live data across all three areas: exception counts (open/unassigned/overdue/due soon/awaiting approval/closed), UAT execution counts, and the latest reconciliation run.

## Reports and demo mode (Sprint 4)

`/reports` offers four live report types — Reconciliation Run Summary, Exception Queue Report, UAT Summary Report, Payments & Settlements Summary — each downloadable as Markdown, CSV, or viewed as a print-friendly HTML page (`/reports/[type]?format=markdown|csv|html`). Every figure is computed by calling the same query/service functions the interactive pages use (`lib/reports/data.ts`), so a report can never disagree with what's shown on screen. There is no scheduling, storage, or templating — reports are generated fresh from the current database state on every request.

A permanent "Demo data" badge in the header makes clear this environment is synthetic. Run `pnpm demo:reset` at any point to wipe and re-seed `payguard_dev` back to the same deterministic starting dataset, regardless of how much you've clicked around and mutated in between.

## Testing

- **Unit tests** (`lib/**/*.test.ts`, Vitest): currency formatting/rounding, status-badge presentation coverage for every enum value, every branch of the settlement-status derivation logic, every reconciliation rule's positive/negative/boundary/missing-data cases plus dedupe-fingerprint and run-summary aggregation logic, and the full Sprint 3 exception-workflow domain layer (state machine transitions, SLA state calculation, resolution/approval/rejection readiness, UAT release recommendation).
- **Service-layer integration tests** (`lib/exception-workflow/service.test.ts`, Vitest): run against a real, disposable Postgres database (`payguard_vitest`, provisioned fresh by the `pretest` script — never your dev database) rather than mocking Prisma, because the behaviour under test (optimistic-concurrency conflicts, transactional audit-event writes, the full assign→investigate→root-cause→resolve→evidence→approve path with a real audit trail, reviewer-separation/evidence/root-cause validation, reject-and-reopen) only exists at the Prisma boundary.
- **E2E tests** (`tests/e2e/*.spec.ts`, Playwright), against a dedicated `payguard_test` database so they never touch your interactive dev database:
  - `smoke.spec.ts` — dashboard navigation, payments list + status filter round-trip, payment detail navigation, settlements list rendering.
  - `reconciliation.spec.ts` — run reconciliation, open the run detail, follow a result to its linked exception, re-run reconciliation and confirm no duplicate open exceptions are created; exceptions list filtering.
  - `exception-lifecycle.spec.ts` — the full assign → investigate → note → root cause → evidence → resolve → independent-user approval journey with an audit-trail assertion; a separate resolve-then-reject journey; exceptions-list status/unassigned filtering.
  - `uat.spec.ts` — record a failed execution, link it to an existing exception, attach evidence, follow the link through to the exception detail page; UAT summary tiles.

  **Known flakiness on resource-constrained machines**: the two longest, most sequential Sprint 3 journeys (`exception-lifecycle.spec.ts`'s multi-step tests) were observed to occasionally hit real Chromium process crashes (`Target page, context or browser has been closed`) on a heavily-loaded shared sandbox during development — not a defect in the application or the tests, confirmed by 100%-reliable results from the equivalent Vitest integration tests and from interactive manual Playwright verification of the identical flows. `playwright.config.ts` sets `retries: 2` and each test retries its own individual step (reloading and re-filling the form) before failing outright, which is sufficient on a normally-resourced machine. Investigating this surfaced and fixed two real issues along the way: the original `useActionState` + native `<form action>` binding was replaced with the `useTransition` pattern (`lib/hooks/useWorkflowActionState.ts`) already used reliably by the Sprint 2 reconciliation button, and navigation links now set `prefetch={false}` (`components/layout/NavLink.tsx`) since every page here is dynamic (cookie-dependent) and repeated background prefetches were observed to starve genuine in-flight requests under load.
