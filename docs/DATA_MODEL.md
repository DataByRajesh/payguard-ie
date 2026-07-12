# Data Model

Twelve Prisma models (`prisma/schema.prisma`), all backing one SQLite database. IDs are `cuid()` strings throughout; there is no auto-increment integer PK anywhere in the schema.

## Core payments/settlements

- **`Customer`** — `customerRef` (unique), `displayName`, `country`. One customer has many payments.
- **`Payment`** — the central entity. `paymentReference` (unique), `amountMinor`/`currency`/`paymentMethod`, `status` (`PaymentStatus`), `expectedSettlementAt`. Indexed on `status` and `customerId` since both are filtered on `/payments`.
- **`Settlement`** — one-to-one with `Payment` (`paymentId @unique`). `amountMinor`/`currency`/`status` (`SettlementStatus`), `settledAt` (nullable — unset until the settlement actually lands), `sourceFileReference`.

**Money is always an integer minor-unit column (`amountMinor`), never a float or `Decimal`** — the standard payments-industry pattern, avoiding floating-point rounding errors. `lib/money.ts` is the only place that converts to/from a display string.

## Reconciliation engine (Sprint 2)

- **`ReconciliationRun`** — one row per "Run reconciliation" click. Denormalized aggregate counts (`totalPayments`, `passedCount`, `failedCount`, `exceptionsCreated`) plus `countsByRule`/`countsBySeverity` stored as JSON strings (SQLite has no native JSON column in this Prisma setup) — computed once at run completion so the run-history list never re-aggregates on read.
- **`ReconciliationResult`** — one row per `(payment, rule)` evaluation on a given run, `passed: false` rows optionally linking to the `ExceptionCase` they created or re-linked to. Indexed on `paymentId`, `reconciliationRunId`, `exceptionCaseId` — all three are read on the payment detail page, the run detail page, and the exception detail page respectively.

See [RECONCILIATION_RULES.md](RECONCILIATION_RULES.md) for what each rule actually evaluates.

## Exception workflow (Sprint 3)

- **`ExceptionCase`** — the largest model in the schema, by design: it carries the entire lifecycle inline (assignment, root cause, resolution, approval) rather than splitting into separate child tables, because each stage has exactly one active value per case (not a history) — the history instead lives in `AuditEvent`. Five separate `User` relations (`assignedUser`, `assignedByUser`, `rootCauseIdentifiedByUser`, `resolutionUser`, `approverUser`) are all named relations (`@relation("ExceptionAssignedUser")` etc.) since Prisma can't infer which foreign key maps to which relation when a model has multiple relations to the same target.
  - `dedupeKey` + `lastDetectedAt` back the idempotency strategy (see [RECONCILIATION_RULES.md#idempotency-strategy](RECONCILIATION_RULES.md#idempotency-strategy)).
  - `version` is the optimistic-concurrency counter (see [EXCEPTION_LIFECYCLE.md#optimistic-concurrency](EXCEPTION_LIFECYCLE.md#optimistic-concurrency)).
  - `source` defaults to `"MANUAL"` at the column level, but every case actually created by this codebase comes from the reconciliation engine with `source: "SYSTEM"` — `"MANUAL"` exists for schema completeness/future manual-case creation, not because any code path uses it today.
- **`ExceptionComment`** — despite the name, these are typed investigation notes (`ExceptionNoteType`), not free-form comments; kept from the Sprint 2 schema name rather than renamed, to avoid an unnecessary migration.
- **`AuditEvent`** — a generic, append-only event log (`entityType` + `entityId`, not a foreign key) shared by both the exception workflow and the UAT workflow, so one model/index serves both rather than two parallel audit tables.
- **`EvidenceRecord`** — nullable foreign keys to *both* `ExceptionCase` and `UATExecution` (never both set on the same row) rather than a polymorphic join table, since there are only ever two possible owners.

## UAT workspace (Sprint 3)

- **`UATTestCase`** — a fixed, seeded test plan entry (`testCaseRef`, steps, expected result, `area`). Not created through the UI.
- **`UATExecution`** — one row per recorded run of a test case. `linkedExceptionCaseId` is optional and always a manual choice (see [UAT_WORKFLOW.md#manual-only-exception-linking](UAT_WORKFLOW.md#manual-only-exception-linking-the-one-rule-that-matters-most-in-this-doc)) — there is no code path that sets it automatically.

## Identity

- **`User`** — seeded only; no sign-up/login flow. `isActive` gates both the acting-user selector and exception assignment (an inactive user can't be assigned or act). Eight named relations back onto `ExceptionCase`/`ExceptionComment`/`EvidenceRecord`/`UATExecution`, reflecting every place a user can be "the actor" for something in this schema.

See [SECURITY_AND_LIMITATIONS.md](SECURITY_AND_LIMITATIONS.md) for what the absence of real authentication means for this model.

## Enums

Thirteen enums in total: the seven Sprint 1 status/category enums (`PaymentStatus`, `SettlementStatus`, `ExceptionType`, `ExceptionSeverity`, `ExceptionStatus`, `UATStatus`, `EvidenceType`), two added in Sprint 2 for the reconciliation engine (`ReconciliationRunStatus`, `ReconciliationRuleType`), and four added in Sprint 3 for the investigation workflow (`ExceptionNoteType`, `RootCauseCategory`, `ResolutionAction`, `ApprovalDecision`). `ExceptionStatus` carries a schema comment (`/// Sprint 3 lifecycle. Supersedes the Sprint 1/2 OPEN/IN_PROGRESS values.`) since its meaning changed mid-project rather than being extended.

Currency (`EUR`/`GBP`) and payment method are **plain validated strings** (`lib/constants.ts`), not Prisma enums — deliberately, since the spec calls out enums only for the domain statuses, not these open-ended operational fields.

## Migrations

`prisma/migrations/` is append-only history, one migration per schema-changing commit — there is no squashing. `npm run db:migrate` (`prisma migrate dev`) is the interactive dev-loop command; `prisma migrate deploy` (used by the test/demo setup scripts) applies existing migrations without generating new ones, which is why those scripts never touch `schema.prisma`.
