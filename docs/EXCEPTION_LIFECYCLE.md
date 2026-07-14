# Exception Lifecycle

This document describes the Sprint 3 investigation, resolution and approval workflow for exception cases (`lib/exception-workflow/`), which sits on top of the Sprint 2 reconciliation engine that creates exceptions in the first place (see [RECONCILIATION_RULES.md](RECONCILIATION_RULES.md)).

Every mutation is attributed to whoever is currently logged in (Cloud Phase 2.1 — signed session cookie via `lib/auth/session.ts`, looked up in `lib/acting-user.ts`) throughout the workflow described below.

## Status state machine

```
NEW ──assign──> ASSIGNED ──start investigation──> INVESTIGATING ─┬─> RESOLVED ──approve──> CLOSED
                                                    ^             │        │
                                                    │  resume     │        └──reject──> INVESTIGATING
                                                    └─────────────┘ mark awaiting info
                                                                  │
                                                          AWAITING_INFORMATION
```

Allowed transitions (`lib/exception-workflow/stateMachine.ts#ALLOWED_TRANSITIONS`):

| From | Allowed to |
| --- | --- |
| `NEW` | `ASSIGNED` |
| `ASSIGNED` | `INVESTIGATING` |
| `INVESTIGATING` | `AWAITING_INFORMATION`, `RESOLVED` |
| `AWAITING_INFORMATION` | `INVESTIGATING` |
| `RESOLVED` | `CLOSED`, `INVESTIGATING` (via rejection) |
| `CLOSED` | *(terminal — no further transitions)* |

**Direct closure is deliberately impossible.** `CLOSED` is only reachable from `RESOLVED` via an approval — there is no transition directly from `NEW`/`ASSIGNED`/`INVESTIGATING`/`AWAITING_INFORMATION` to `CLOSED`. Every attempted transition is checked by `assertTransition()`, which throws `InvalidTransitionError` for anything not in the table above; the Server Action layer maps that to a user-facing message rather than a stack trace.

Every exception case is auto-created by the reconciliation engine at `status: NEW`, unassigned, `source: "SYSTEM"` — the workflow described here always starts from that point (or, for demo/seed purposes, is driven forward through it via the real service functions — see [Seed data](#seed-data) below).

## Assignment

`assignException()` (`lib/exception-workflow/service.ts`) can be called at any point except `RESOLVED`/`CLOSED`:

- From `NEW`, assigning transitions the case to `ASSIGNED`.
- From `ASSIGNED`/`INVESTIGATING`/`AWAITING_INFORMATION`, assigning to a different user **reassigns** without changing status.
- The target user must be `isActive: true` — assigning to an inactive seeded user is rejected with a clear message (`lib/actions/exceptions.ts#assignExceptionAction`).
- Every assignment/reassignment writes an `AuditEvent` (`EXCEPTION_ASSIGNED` / `EXCEPTION_REASSIGNED`), including an optional free-text note.

## Investigation notes

Append-only, typed notes (`ExceptionComment` model, despite the name — kept from Sprint 2's schema and extended rather than replaced) via `addNoteToException()`. Five types (`lib/exception-workflow/types.ts#EXCEPTION_NOTE_TYPES`): `INVESTIGATION`, `CUSTOMER_UPDATE`, `TECHNICAL_FINDING`, `HANDOVER`, `RESOLUTION_NOTE`. Notes can be added in any non-terminal status. The audit event for a note (`EXCEPTION_NOTE_ADDED`) deliberately does **not** copy the note body into the audit summary — the audit trail records *that* a note of a given type was added and by whom, not its content, keeping the two concerns (structured audit trail vs. free-text investigation log) separate.

## Root-cause analysis

`recordRootCause()` requires the case to be `INVESTIGATING` or `AWAITING_INFORMATION`, and enforces two things (`lib/exception-workflow/resolution.ts` shares the same validation via `assessResolutionReadiness`):

- A category from a fixed list of ten (`ROOT_CAUSE_CATEGORIES`): `PROCESSING_CONFIGURATION`, `SETTLEMENT_FILE_MISSING`, `UPSTREAM_PROVIDER_DELAY`, `DUPLICATE_SUBMISSION`, `DATA_MAPPING_ERROR`, `CURRENCY_CONFIGURATION`, `STATUS_SYNCHRONISATION`, `MANUAL_PROCESSING_ERROR`, `UNKNOWN`, `OTHER`.
- A summary of at least `minRootCauseSummaryLength` (10, `config.ts`) trimmed characters — a `DomainValidationError` blocks a one-word or empty summary.

Root cause can be recorded once and later **updated** (the UI and audit action distinguish `ROOT_CAUSE_RECORDED` from `ROOT_CAUSE_UPDATED`) without changing status, so an analyst can revise their assessment mid-investigation.

## Resolution

`submitResolution()` requires ALL of the following, checked by `assessResolutionReadiness()` (`lib/exception-workflow/resolution.ts`) before the transition is attempted:

1. Status is `INVESTIGATING` (not `AWAITING_INFORMATION` — the case must be resumed first).
2. An owner is assigned.
3. A root-cause category is recorded.
4. The root-cause summary is present and meets the minimum length.

On success the case moves to `RESOLVED` with a resolution action from a fixed list of eight (`RESOLUTION_ACTIONS`): `CORRECTIVE_SETTLEMENT_APPLIED`, `PAYMENT_STATUS_CORRECTED`, `DUPLICATE_TRANSACTION_CANCELLED`, `CONFIGURATION_CORRECTED`, `UPSTREAM_PROVIDER_CONFIRMED`, `ACCEPTED_OPERATIONAL_EXCEPTION`, `NO_ISSUE_FOUND`, `OTHER`, plus a free-text summary. **Submitting a resolution never touches the underlying payment/settlement/reconciliation data** — this workflow is a record of the investigation and decision, not a reconciliation-correcting action; any actual data correction (e.g. a corrective settlement) is a separate, out-of-band operational action that the resolution summary documents.

## Approval and closure

A `RESOLVED` case requires independent review before it can close — `assessReviewerSeparation()` (`lib/exception-workflow/approval.ts`), shared by both approval paths, rejects the review if the reviewer is the same user who submitted the resolution (`DomainValidationError`, surfaced in the UI as *"Log in as a different demo user to approve or reject it"*).

- **Approve** (`approveException()`) additionally requires **at least one evidence record** attached to the case — closure without any supporting evidence is blocked. On success: `status: CLOSED`, `approvalDecision: APPROVED`, `closedAt` set (this is what the SLA calculation below uses to decide on-time vs. late).
- **Reject** (`rejectException()`) has no evidence requirement (nothing is being closed) and returns the case to `INVESTIGATING` with `approvalDecision: REJECTED`, so the resolver can revise the root cause or resolution and resubmit.

## SLA handling

`calculateSlaState()` (`lib/exception-workflow/sla.ts`) is a pure function of `(slaDeadline, closedAt, now)` — the deadline itself is fixed once, at exception-creation time, by the reconciliation engine (severity-based offset, see `exceptionSlaHoursBySeverity` in [RECONCILIATION_RULES.md](RECONCILIATION_RULES.md#configuration-reference)), and never recalculated here.

Five states (`SLA_STATES`):

| State | When |
| --- | --- |
| `ON_TRACK` | Open, more than `dueSoonThresholdHours` (4h) from the deadline |
| `DUE_SOON` | Open, within `dueSoonThresholdHours` of the deadline |
| `OVERDUE` | Open, past the deadline |
| `COMPLETED_ON_TIME` | Closed (`closedAt` set) at or before the deadline |
| `COMPLETED_LATE` | Closed after the deadline |

**Historical deadlines are immutable**: once a case closes, its SLA outcome (on-time vs. late) is fixed forever by comparing the `closedAt` instant against the `slaDeadline` recorded at creation — later re-evaluating a closed case never changes this, since a closed case's SLA state is a historical fact, not a live measurement.

## Evidence

Append-only evidence records (`EvidenceRecord`) attachable to an exception case at any point via `addEvidenceToException()`: a type (`EVIDENCE_TYPES`: `SCREENSHOT`, `LOG_EXTRACT`, `QUERY_RESULT`, `SIGN_OFF_DOCUMENT`, `OTHER`), a title, an optional description, and either (or neither) an optional `fileReference` (a plain string — a path, URL or internal reference) or a real uploaded file. **Cloud Phase 2.4** added actual file storage (`lib/evidence-storage/`, 10MB cap, MIME allow-list) — see [SECURITY_AND_LIMITATIONS.md#evidence-file-storage-cloud-phase-24](SECURITY_AND_LIMITATIONS.md#evidence-file-storage-cloud-phase-24) for the storage adapters and their trade-offs.

## Optimistic concurrency

Every mutation requires the caller to supply the `version` it last read (`ExceptionCase.version`, an incrementing integer). `updateExceptionWithVersionCheck()` (`lib/exception-workflow/persistence.ts`) performs `updateMany({ where: { id, version: expectedVersion }, data: { ...data, version: { increment: 1 } } })` — if no row matches (because someone else mutated it since the page was loaded), zero rows are affected and a `ConcurrencyConflictError` is thrown, surfaced to the UI as *"This case was changed by someone else since you loaded it. Reload and try again."* This is why every workflow form embeds a hidden `expectedVersion` field (`WorkflowHiddenFields`, `components/ui/FormMessage.tsx`) alongside the exception ID.

## Audit trail

Every mutation writes an `AuditEvent` (`entityType: "EXCEPTION_CASE"`) inside the same database transaction as the state change it describes, so the audit trail can never silently fall out of sync with the actual data. The full list of actions: `EXCEPTION_ASSIGNED`, `EXCEPTION_REASSIGNED`, `EXCEPTION_STATUS_CHANGED` (investigate/request-information/resume), `EXCEPTION_NOTE_ADDED`, `ROOT_CAUSE_RECORDED`/`ROOT_CAUSE_UPDATED`, `RESOLUTION_SUBMITTED`, `EVIDENCE_ADDED`, `EXCEPTION_APPROVED`, `RESOLUTION_REJECTED` — rendered chronologically on the exception detail page's audit timeline.

**Authenticated actor (Cloud Phase 2.3):** `AuditEvent.actorUserId` is a required foreign key to `User`, not a free-text name — the display name shown on the timeline (`components/exceptions/AuditTimeline.tsx`) is always read live via the `actorUser` relation (`lib/queries/audit.ts`), so it can never drift from the real name on record. Machine-driven events (e.g. `EXCEPTION_AUTO_CREATED` from the reconciliation engine) attribute to whoever clicked "Run reconciliation," never a synthetic "SYSTEM" label; a seeded, unloginable service-account user (`system@payguard-ie.internal`, `passwordHash: null`) is the fallback for any event with no real acting user. `scripts/backfill-audit-actor.ts` documents the one-time migration that moved existing rows from the old free-text `actor` column to this FK.

## Seed data

`prisma/seed.ts` deliberately does **not** hand-craft exception rows in advanced statuses. After the reconciliation engine runs (creating every exception at `NEW`), the seed script drives a representative slice of those same engine-created exceptions through the real service functions above (`assignException`, `startInvestigation`, `recordRootCause`, `submitResolution`, `approveException`, `rejectException`, `addEvidenceToException`) — the exact same code path a real user's click would trigger — to produce a realistic spread of demo data: an unassigned `NEW` case, an `ASSIGNED` case, an `INVESTIGATING` case, an `AWAITING_INFORMATION` case, a `RESOLVED` case awaiting approval, a `CLOSED` case approved on time, a `CLOSED` case approved late (by passing a synthetic `now` far past its SLA deadline), a case forced into `OVERDUE` for a guaranteed-visible demo example, and a rejected-then-reopened case. This keeps the seed data and the workflow logic impossible to disagree with each other, the same philosophy Sprint 2 used for the reconciliation engine.

## Known limitations

- Role-based authorization (Cloud Phase 2.2, `lib/auth/permissions.ts`) decides which roles may attempt each action, but there's no finer-grained scoping (e.g. by team or region) — every `OPS_ANALYST` can act on every exception case.
- No email/real-time notifications on assignment, SLA breach or rejection (out of scope per the sprint brief).
- Evidence is metadata-only; there is no file upload or cloud storage.
- A single global `dueSoonThresholdHours` and severity-based SLA table apply uniformly; a production system might vary these by exception type or customer segment.
