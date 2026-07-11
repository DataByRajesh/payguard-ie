# PayGuard IE

An internal payments operations, reconciliation, exception-investigation and UAT evidence platform for Irish and European FinTech teams.

- **Sprint 1**: project foundation plus fully functional Payments and Settlements areas.
- **Sprint 2**: a deterministic reconciliation engine — seven rules evaluated against every payment/settlement, stored results, idempotent exception creation, and functional `/reconciliation` (+ run detail) and `/exceptions` (+ case detail) pages.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma + SQLite, Zod, Vitest and Playwright. No AI features, external APIs, authentication or automatic payment submission are implemented.

## Requirements

- Node.js 20.9+ (Next.js 16 minimum)
- npm

## Setup

```bash
npm install
cp .env.example .env
npm run db:migrate
npm run db:seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — it redirects to `/dashboard`.

## Database

This project uses Prisma with a local SQLite database (`prisma/dev.db`, gitignored). Prisma Client is generated into `app/generated/prisma` and accessed via a `better-sqlite3` driver adapter (`lib/db.ts`), per Prisma 7's driver-adapter-based client generation.

- `npm run db:migrate` — apply schema migrations to your local dev database (`prisma/dev.db`)
- `npm run db:seed` — (re)seed the database with ~50 synthetic payments covering every reconciliation scenario (matched, missing settlement, amount/currency mismatch, duplicate payment, delayed settlement, stuck/pending, invalid status combination, failed payment), plus settlements, UAT test cases/executions/evidence, and users. The seed script then runs the **real reconciliation engine** against that data (the same code path the UI's "Run reconciliation" button calls), so the resulting `ReconciliationRun`, `ReconciliationResult` and `ExceptionCase` rows are genuinely engine-generated, not hand-authored. A handful of the resulting exceptions are then annotated with investigation comments/evidence and a couple of statuses advanced, for UI variety. Safe to re-run — it clears existing data first.
- `npm run db:reset` — drop and recreate the database from scratch, then re-seed
- `npm run db:studio` — open Prisma Studio to browse the data

Connection string lives in `.env` (`DATABASE_URL="file:./prisma/dev.db"`). See `.env.example` for the template. `prisma.config.ts` is Prisma 7's config file (schema/migration paths, seed command); it replaces the datasource `url` that used to live directly in `schema.prisma`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Run Vitest unit tests once |
| `npm run test:watch` | Vitest in watch mode |
| `npm run test:e2e` | Run the Playwright smoke suite against a prebuilt server and a separate `prisma/test.db` (auto-migrated and seeded first) |

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

**Local workflow**: `npm run dev`, open `/reconciliation`, click "Run reconciliation". The run summary, run history, and a full results table (with links to the underlying payment, settlement and any generated exception) update immediately. `/exceptions` is a filterable queue (type/severity/status/SLA state/payment reference) with a detail page showing the triggering reconciliation result, audit timeline, comments and evidence.

**Known limitations**: no pagination (loads all payments per run — fine at this project's scale), sequential (not batched) persistence writes, no auth on the run action (there is no auth anywhere in the app yet). Full list in `docs/RECONCILIATION_RULES.md`.

## Testing

- **Unit tests** (`lib/**/*.test.ts`, Vitest): currency formatting/rounding, status-badge presentation coverage for every enum value, every branch of the settlement-status derivation logic, and — for the reconciliation engine — every rule's positive/negative/boundary/missing-data cases plus dedupe-fingerprint and run-summary aggregation logic.
- **E2E tests** (`tests/e2e/*.spec.ts`, Playwright), against a dedicated `prisma/test.db` so they never touch your interactive dev database:
  - `smoke.spec.ts` — dashboard navigation, payments list + status filter round-trip, payment detail navigation, settlements list rendering.
  - `reconciliation.spec.ts` — run reconciliation, open the run detail, follow a result to its linked exception, re-run reconciliation and confirm no duplicate open exceptions are created; exceptions list filtering.
