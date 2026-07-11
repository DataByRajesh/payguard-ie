# PayGuard IE

An internal payments operations, reconciliation, exception-investigation and UAT evidence platform for Irish and European FinTech teams. This is the Sprint 1 delivery: project foundation plus fully functional Payments and Settlements areas, with professional placeholders for the remaining planned pages.

Built with Next.js (App Router), TypeScript, Tailwind CSS, Prisma + SQLite, Zod, Vitest and Playwright. No AI features or automatic payment submission are implemented.

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
- `npm run db:seed` — (re)seed the database with ~48 synthetic payments covering every reconciliation scenario (matched, missing settlement, amount/currency mismatch, duplicate payment, delayed settlement, SLA breach, failed payment), plus settlements, exception cases with comments and evidence, a reconciliation run, UAT test cases/executions/evidence, and users. Safe to re-run — it clears existing data first.
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
- **Settlement status shown on the Payments/Settlements pages is derived live**, not read from a stored snapshot: `lib/reconciliation.ts#deriveSettlementDisplayStatus` compares the current `Payment` and `Settlement` records on every read. This guarantees the UI can never show stale reconciliation results, since Sprint 1 has no scheduled matching engine yet. `ReconciliationRun`/`ReconciliationResult` rows are still seeded (using this same function) to preview the `/reconciliation` page and prove out the schema for a future automated engine.
- **Currency and payment method** are plain validated strings (`lib/constants.ts`), not Prisma enums — enums are reserved for the domain statuses the spec calls out explicitly.
- Filters on `/payments` and `/settlements` are plain server-rendered `<form method="GET">`s validated with Zod (`lib/validation/`) — no client-side table state, fully functional without JavaScript.
- `lib/queries/` is the only layer that talks to Prisma; pages and components never import `lib/db` directly.

## Testing

- **Unit tests** (`lib/*.test.ts`, Vitest): currency formatting/rounding, status-badge presentation coverage for every enum value, and every branch of the settlement-status derivation logic.
- **E2E smoke test** (`tests/e2e/smoke.spec.ts`, Playwright): dashboard navigation, payments list + status filter round-trip, payment detail navigation, settlements list rendering. Runs against a dedicated `prisma/test.db` so it never touches your interactive dev database.
