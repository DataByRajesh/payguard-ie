# Security and Limitations

PayGuard IE is a **portfolio project**, not a production payments system. This document is the single place that consolidates every deliberate scope boundary mentioned elsewhere in the docs, so it's clear what's a real design decision versus what's simply out of scope for a project with no production deployment target.

## No authentication

There is no login, session, password, or identity provider anywhere in this codebase. `lib/acting-user.ts` reads a plain, unsigned cookie (`payguard_acting_user_id`) to decide which seeded `User` row every mutation is attributed to, falling back to the first active seeded user if the cookie is missing or points at an inactive/deleted one. The header's "Acting as" selector and permanent "Demo data" badge ([AppShell.tsx](../components/layout/AppShell.tsx)) exist specifically so this is never mistaken for real access control — anyone with network access to the app can act as any seeded user, including approving their own resolutions by simply switching the selector (the "approver must differ from resolver" rule, [EXCEPTION_LIFECYCLE.md#approval-and-closure](EXCEPTION_LIFECYCLE.md#approval-and-closure), only prevents doing so *without* switching).

**Consequence:** no Server Action in this codebase performs an authorization check ("is this actor allowed to do this?") — only validation checks ("is this input well-formed, is this state transition legal?"). A production version of this system would need real authentication plus role-based authorization on every mutation, none of which exists here.

## No real payment rails or external connectivity

There is no message queue, no background jobs/cron, no outbound HTTP calls, no file storage service, no multi-tenancy, and no connection to any real bank, card scheme, or payment processor. Every `Payment`/`Settlement` row is synthetic seed data ([DATA_MODEL.md](DATA_MODEL.md)) — the "settlement file" concept referenced by the reconciliation engine's `sourceFileReference` field is a label on a seeded row, not an actual file ingested from anywhere.

## Evidence is metadata-only

`EvidenceRecord` ([DATA_MODEL.md](DATA_MODEL.md)) stores a type, title, description, and an optional free-text `fileReference` — never a file. There is no upload endpoint and no cloud storage integration anywhere in this project. In a real system, evidence attached to an exception case or UAT execution (screenshots, log extracts, sign-off documents) would need actual file storage with its own access controls; here it's a pointer describing where such an artifact *would* live.

## Reports export whatever is in the database, unauthenticated

`/reports/[type]` ([SPRINT4_SUMMARY.md](../SPRINT4_SUMMARY.md)) is a public, unauthenticated route handler that dumps the full current contents of the payments, exceptions, or UAT tables as Markdown/CSV/HTML. This is safe here only because the underlying data is synthetic — a production equivalent would need the same authorization layer called out above, applied per-report, likely scoped to what the requesting user is allowed to see.

## Optimistic concurrency, not locking

`ExceptionCase.version` ([EXCEPTION_LIFECYCLE.md#optimistic-concurrency](EXCEPTION_LIFECYCLE.md#optimistic-concurrency)) prevents silently lost updates between two concurrent editors, but there's no pessimistic locking — two users can both open the same case, and whoever submits second gets a "reload and try again" error rather than a blocked UI. This is an intentional, standard web-app trade-off, not a gap, but worth naming here since it is a concurrency-control decision with security-adjacent implications (data integrity under concurrent access).

## No pagination at scale

Both the reconciliation engine (loads every payment per run) and the reports exports (loads every row of the requested type) run unpaginated queries. This is fine at this project's seed-data scale (dozens–hundreds of rows) and would need batching/streaming before it could handle real production volume — see [RECONCILIATION_RULES.md#known-limitations-engine-wide](RECONCILIATION_RULES.md#known-limitations-engine-wide).

## Local Postgres, no backup/replication story

The local Postgres instance (`docker-compose.yml`) is a single, disposable container with no replica ([ARCHITECTURE.md](ARCHITECTURE.md), [LOCAL_POSTGRES_SETUP.md](LOCAL_POSTGRES_SETUP.md)). `pnpm demo:reset` drops and recreates the `payguard_dev` schema from scratch — deliberately destructive, and deliberately scoped to only ever touch that one local database (never a Preview/Production database, and never anything outside the local Docker container). There is no backup, point-in-time recovery, or replication story for the local environment; the cloud environment (Phase 1B) relies on the managed Postgres provider's own backup/PITR guarantees rather than anything this project implements itself.

## Duplicate-payment detection is a heuristic, not a guarantee

Covered in full in [RECONCILIATION_RULES.md#4-duplicate-payment](RECONCILIATION_RULES.md#4-duplicate-payment): because the schema has no merchant-supplied idempotency key, duplicate detection fingerprints on `(customerId, amountMinor, currency, paymentMethod)` within a time window, which has both false-positive and false-negative failure modes documented there. Flagged here again because it's the limitation most likely to matter if this reconciliation approach were ever adapted for a real system.

## Summary

None of the above is a bug — every item is a named, deliberate scope boundary for a project built to demonstrate architecture and workflow design, not to move real money. If you're evaluating this codebase as a reference for a production system, treat this document as the checklist of what still needs to be built before it could be one.
