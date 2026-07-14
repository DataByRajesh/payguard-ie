# PayGuard IE — Sprint 4 Delivery Summary

**Scope**: turn the remaining professional placeholders into functional features, and make the project trivially demo-able — the "portfolio polish" sprint.

## What was built

- **`/reports` and `/reports/[type]`**: four live report types (Reconciliation Run Summary, Exception Queue Report, UAT Summary Report, Payments & Settlements Summary), each exportable as Markdown, CSV, or a print-friendly HTML page (`Ctrl/Cmd+P` to save as PDF), generated on demand from the current database state — no scheduling, no templating, no stored report history. `lib/reports/data.ts` composes each report from the same query/service functions the rest of the app already uses (`getExceptionQueueSummary`, `calculateSlaState`, `computeReleaseRecommendation`, …) rather than duplicating any business logic; `lib/reports/format.ts` handles the three output encodings (HTML-escaping, RFC-4180-ish CSV cell escaping, Markdown table generation) as a pure formatting layer over a shared `ReportTable` shape.
- **Payment detail audit timeline**: the Sprint 1 `PaymentTimelinePlaceholder` component is gone — `/payments/[id]` now renders the same real `AuditTimeline` component the exception workspace uses, reading `AuditEvent` rows for that payment via `getAuditEventsForEntity("PAYMENT", ...)`. This was the last professional-placeholder-turned-real-feature from the original Sprint 1 page inventory.
- **Demo mode** (`npm run demo:reset`, `scripts/demo-reset.ts`): wipes `prisma/dev.db` (and its `-journal`/`-wal`/`-shm` sidecars) and re-runs migrate + seed, so a stranger cloning the repo — or a reviewer who's clicked around and mutated a bunch of exception cases — can get back to the exact same deterministic starting dataset with one command. Deliberately scoped to touch only this project's own local dev database file, never anything else on disk.
- **Visible demo-data badge**: a permanent "Demo data" pill in the app header (`components/layout/AppShell.tsx`) with a tooltip stating plainly that all data is synthetic — so the app is self-explanatory to someone encountering it cold (a portfolio reviewer, an interview panel), without needing this document open alongside it.

## Design note: why reports duplicate no business logic

Every number on every report — SLA state, release recommendation, settlement status — is computed by calling the exact same pure functions the interactive pages call, not by re-deriving it inline in the report layer. This means a report can never disagree with what the UI shows for the same data, and it's the same "single source of truth per computation" philosophy the reconciliation engine and exception workflow already follow (see [ARCHITECTURE.md](docs/ARCHITECTURE.md)).

## Verification (all green)

- `npm run lint`, `npm run typecheck` — clean
- `npm test` — 121 Vitest unit + service-integration tests passing (no new business logic was added this sprint, so no new domain tests were needed; the reports/format layer is a pure presentation layer over already-tested data — see [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md#whats-deliberately-not-covered))
- Manual verification: all four report types downloaded/viewed in each of the three formats, `npm run demo:reset` run end-to-end from a dirty local database back to a clean seeded one

## Repo state

Merged to `main` via PR #3 (`feature/sprint-4-portfolio`). This sprint also includes the documentation pass this file is part of: [docs/DATA_MODEL.md](docs/DATA_MODEL.md), [docs/TESTING_STRATEGY.md](docs/TESTING_STRATEGY.md), [docs/SECURITY_AND_LIMITATIONS.md](docs/SECURITY_AND_LIMITATIONS.md), [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), and this sprint-by-sprint summary series ([Sprint 1](SPRINT1_SUMMARY.md), [Sprint 2](SPRINT2_SUMMARY.md), [Sprint 3](SPRINT3_SUMMARY.md)) — written to make the project's design decisions legible to a reviewer without having to read every file.
