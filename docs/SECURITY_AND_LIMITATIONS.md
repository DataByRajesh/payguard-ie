# Security and Limitations

PayGuard IE is a **portfolio project**, not a production payments system — the public Vercel demo ([CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md)) exists to showcase it, not to operate real payments infrastructure. This document is the single place that consolidates every deliberate scope boundary mentioned elsewhere in the docs, so it's clear what's a real design decision versus what's simply out of scope.

## Authentication and role-based authorization (Cloud Phase 2.1 / 2.2)

There is real login: `proxy.ts` redirects any request without a valid session cookie to `/login` (Next.js 16's Node.js-runtime `proxy` convention, formerly `middleware`); `lib/actions/auth.ts` checks a password (`node:crypto.scrypt`, `lib/auth/password.ts`) against the seeded `User.passwordHash` and, on success, issues a signed session cookie (`lib/auth/session.ts`, HMAC-SHA256 over `{userId, issuedAt, expiresAt}`, `SESSION_SECRET`). Every seeded user shares one demo password (`SEED_USER_PASSWORD`, published on the `/login` page itself) so a reviewer can still log in as any role to explore the app — but doing so now genuinely requires the credential, not just picking a name from a dropdown.

**Sessions are stateless — no server-side revocation before expiry.** The signed cookie is self-contained; there is no session table to invalidate. The one revocation path that exists is `User.isActive`, checked on every request (`lib/acting-user.ts`) — deactivating a user immediately blocks their next request even with a still-valid, unexpired cookie. There is no way to revoke a single session (e.g. "log out this one device") without deactivating the whole user. **Upgrade path, not built here:** an opaque-token `Session` table (id, userId, expiresAt, revokedAt) keyed by a random token instead of a signed payload, if per-session revocation is ever needed.

**Role-based authorization** (`lib/auth/permissions.ts`) now sits alongside identity: every mutating Server Action calls `requirePermission(actor, permission)` right after resolving the logged-in actor, rejecting the attempt with a clear message if that actor's role (`OPS_ANALYST` / `APP_SUPPORT` / `UAT_LEAD` / `ADMIN`) isn't in the permission's allow-list. This is a deliberate, easily-changed product default (one map, table-tested in `lib/auth/permissions.test.ts`), not a hard technical constraint. It decides *who may attempt* an action; it does not replace or weaken the "approver must differ from resolver" rule ([EXCEPTION_LIFECYCLE.md#approval-and-closure](EXCEPTION_LIFECYCLE.md#approval-and-closure)) — that domain check still applies afterward, to every role, including `ADMIN`. User/role management itself (`/settings`, `lib/actions/users.ts`) is `ADMIN`-only via the same mechanism.

**Cloud demo mode is unchanged:** the public Vercel demo still runs with `DEMO_READ_ONLY=true` ([CLOUD_DEPLOYMENT.md](CLOUD_DEPLOYMENT.md)), making every mutating Server Action a no-op regardless of who's logged in or which role they have. This remains a blanket read-only switch, not authorization, and composes independently of both login and RBAC — the public demo is read-only for every user.

## No real payment rails or external connectivity

There is no message queue, no background jobs/cron, no outbound HTTP calls, no file storage service, no multi-tenancy, and no connection to any real bank, card scheme, or payment processor. Every `Payment`/`Settlement` row is synthetic seed data ([DATA_MODEL.md](DATA_MODEL.md)) — the "settlement file" concept referenced by the reconciliation engine's `sourceFileReference` field is a label on a seeded row, not an actual file ingested from anywhere.

## Evidence file storage (Cloud Phase 2.4)

`EvidenceRecord` ([DATA_MODEL.md](DATA_MODEL.md)) can now hold a real uploaded file, not just a free-text `fileReference` pointer — `lib/evidence-storage/` provides two adapters selected by `EVIDENCE_STORAGE_PROVIDER`: `local` (default; writes to a gitignored `.data/evidence/` directory, served back through `app/evidence/[...path]/route.ts`, itself behind `proxy.ts`'s session check like every other route) and `vercel-blob` (the public Preview/Production demo; `@vercel/blob`, whose URLs are already public HTTPS). Uploads are capped at 10MB and restricted to an explicit MIME allow-list (`lib/validation/evidenceFile.ts`) — anything else is rejected with a clear message before it reaches storage.

**What this doesn't add:** access control on the file itself. The local route only serves files already registered as an `EvidenceRecord.storageKey` (not arbitrary paths), and requires a valid session like everything else, but any logged-in user can view any evidence file's URL — there's no per-file ownership or role check beyond the existing `EXCEPTION_EVIDENCE`/`UAT_EVIDENCE` permission on *adding* evidence (Cloud Phase 2.2). Vercel Blob URLs are public-by-design once issued (`access: "public"`) — anyone with the URL can view the file, whether or not they're logged into this app; this is an explicit, standard trade-off for Blob's simplicity, acceptable here since every uploaded file is synthetic demo data.

## Reports export whatever is in the database, to any logged-in user

`/reports/[type]` ([SPRINT4_SUMMARY.md](../SPRINT4_SUMMARY.md)) is a route handler that dumps the full current contents of the payments, exceptions, or UAT tables as Markdown/CSV/HTML. `proxy.ts` requires a valid session to reach it (Cloud Phase 2.1), but there is no per-report authorization — every logged-in user can pull every report regardless of role. This is safe here only because the underlying data is synthetic — a production equivalent would need the role-based authorization layer called out above, applied per-report, likely scoped to what the requesting user is allowed to see.

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
