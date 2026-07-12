# PayGuard IE — Sprint 2 Delivery Summary

**Scope**: a deterministic reconciliation engine plus functional `/reconciliation` and `/exceptions` pages, replacing the Sprint 1 placeholders.

## What was built

- **Reconciliation engine** (`lib/reconciliation-engine/`): seven pure rules — missing settlement, amount mismatch, currency mismatch, duplicate payment, delayed settlement, stuck (pending) payment, invalid status combination — evaluated against every payment on each run, in the four-layer shape (pure domain rules → orchestration service → persistence → Server Action) documented in [ARCHITECTURE.md](docs/ARCHITECTURE.md). Full rule-by-rule business purpose, triggers, severity logic, edge cases and limitations: [docs/RECONCILIATION_RULES.md](docs/RECONCILIATION_RULES.md).
- **Idempotency**: re-running reconciliation against unchanged data never creates duplicate open exceptions — a deterministic dedupe key per `(payment, settlement, rule)` links repeat failures to the existing open case instead of creating a new one.
- **Concurrency/failure recovery**: run start-check and row creation happen inside one transaction (no double-start race on a double-click); a run left `RUNNING` past `maxRunDurationMinutes` (30) is treated as abandoned and auto-marked `FAILED` on the next attempt, so a crashed run can never permanently block future runs.
- **`/reconciliation`, `/reconciliation/[id]`**: trigger a run, view run history, inspect a run's full results table with links to the underlying payment/settlement/exception.
- **`/exceptions`**: a filterable queue (type/severity/status/SLA state/payment reference) reading exceptions the engine created — read-only this sprint; the investigation workflow itself is Sprint 3.
- **Seed data**: rewritten to derive exceptions from the real reconciliation engine run against the seeded payments/settlements, rather than hand-authoring exception rows — so the seed data and the engine logic can never disagree with each other.

## Notable bugs caught and fixed during build (pre-merge review)

1. A run-start race: two near-simultaneous "Run reconciliation" invocations could both observe "nothing running" and both proceed — fixed by moving the check-and-create into a single Prisma transaction.
2. A stale-run lockout: a crashed/killed run left permanently `RUNNING` would block every future run forever — fixed with the `maxRunDurationMinutes` auto-fail-on-next-attempt logic above.
3. Logging and timezone inconsistencies flagged in review — all displayed timestamps (including SLA deadlines) are pinned to `Europe/Dublin` (`lib/format.ts`) independent of the host machine's own timezone, while the underlying rule comparisons stay timezone-agnostic instant arithmetic.

## Verification (all green)

- `npm run lint`, `npm run typecheck`, `npm run build` — clean
- `npm test` — Vitest unit coverage for every rule's positive/negative/boundary/missing-data cases, dedupe-fingerprint logic, and run-summary aggregation
- `npm run test:e2e` — Playwright coverage: run reconciliation, open run detail, follow a result to its exception, re-run and confirm no duplicate open exceptions, exceptions-list filtering

## Repo state

Delivered on `feature/sprint-2-reconciliation`, merged to `main` via PR #1 (`410f32b`) after a pre-merge review pass (`f25c4a0`) addressed the three findings above.
