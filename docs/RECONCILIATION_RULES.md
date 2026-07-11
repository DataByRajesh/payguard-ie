# Reconciliation Rules

This document describes the seven deterministic rules evaluated by the reconciliation engine (`lib/reconciliation-engine/`) on every run, plus the shared configuration and idempotency strategy behind them.

All thresholds referenced below live in one place: `lib/reconciliation-engine/config.ts` (`RECONCILIATION_CONFIG`). Rule files never hard-code a threshold.

Every rule is a pure function of the form `(context: RuleContext) => RuleEvaluation` (`lib/reconciliation-engine/types.ts`) — no Prisma, React, Next.js or Node database imports, and no reliance on the system clock (`now` is always passed in). This makes every rule trivially unit-testable with fixed timestamps.

---

## 1. Missing settlement

**File:** `lib/reconciliation-engine/rules/missingSettlement.ts`

- **Business purpose:** Flags payments the bank/scheme has confirmed as completed but for which no settlement file has ever arrived — the single most operationally important reconciliation failure, since money movement is unconfirmed.
- **Inputs:** `payment.status`, `payment.expectedSettlementAt`, presence of a `settlement`, `now`.
- **Trigger conditions:** `payment.status === COMPLETED`, no settlement exists, and `now > expectedSettlementAt`.
- **Severity logic:** `MEDIUM` if only just overdue; escalates to `HIGH` once overdue beyond `settlementGracePeriodHours` (24h default).
- **Output:** `expectedValue` = the expected settlement timestamp; `actualValue` = `null` (nothing to compare against); `metadata.overdueHours`.
- **Edge cases:** A payment that is `COMPLETED` but not yet past its expected settlement date passes (this is normal, not a failure). A payment with any other status never triggers this rule, even with no settlement — that is expected for `PENDING`/`FAILED`/`REVERSED` payments.
- **Limitations:** Uses a single grace period for every payment method/currency. In a future sprint this could vary by settlement provider or payment rail (e.g. SEPA vs. SWIFT settle on different cycles).

## 2. Amount mismatch

**File:** `lib/reconciliation-engine/rules/amountMismatch.ts`

- **Business purpose:** Catches settlement files that record a different amount than what was charged — a common file-processing or FX-rounding defect.
- **Inputs:** `payment.amountMinor`, `settlement.amountMinor`.
- **Trigger conditions:** A settlement exists and its `amountMinor` differs from the payment's.
- **Severity logic:** `HIGH` if the absolute difference is `>= highSeverityAmountThresholdMinor` (5000 minor units, i.e. €50/£50 by default), else `MEDIUM`.
- **Output:** `expectedValue`/`actualValue` = the two amounts as strings; `differenceMinor` = **signed** difference (`settlement - payment`), so a negative value means the settlement under-recorded the payment; `metadata.absDifference`.
- **Edge cases:** No settlement yet → passes (this rule is silent until there's something to compare). Amounts equal → passes.
- **Limitations:** The threshold is a flat minor-unit amount, not a percentage — a €50 discrepancy on a €100 payment and on a €100,000 payment are both flagged identically. A percentage-based threshold might be more appropriate at scale.

## 3. Currency mismatch

**File:** `lib/reconciliation-engine/rules/currencyMismatch.ts`

- **Business purpose:** Detects a settlement recorded in the wrong currency, which usually indicates a file-routing error at the settlement provider (this schema only carries EUR/GBP, but the rule is currency-agnostic).
- **Inputs:** `payment.currency`, `settlement.currency`.
- **Trigger conditions:** A settlement exists and its currency differs from the payment's.
- **Severity logic:** Always `HIGH` — a currency mismatch is never a rounding artifact and always needs investigation.
- **Output:** `expectedValue`/`actualValue` = the two currency codes.
- **Edge cases:** No settlement yet → passes.
- **Limitations:** Does not attempt any FX-equivalence check (e.g. recognising that a EUR settlement might be a legitimate FX conversion of a GBP payment under some business models) — any difference is treated as an error.

## 4. Duplicate payment

**File:** `lib/reconciliation-engine/rules/duplicatePayment.ts`, fingerprint in `lib/reconciliation-engine/dedupe.ts`

- **Business purpose:** Detects likely duplicate charges — the same customer charged twice for what looks like the same transaction.
- **Inputs:** `(customerId, amountMinor, currency, paymentMethod)` fingerprint, `createdAt`, the full payment set for the run.
- **Trigger conditions:** Another payment with an identical fingerprint exists, created strictly earlier, within `duplicatePaymentWindowHours` (24h default). Only the **later** payment of a matching pair is flagged, so a genuine duplicate produces exactly one exception, not two.
- **Severity logic:** Always `CRITICAL` — a duplicate charge is a direct customer-money issue.
- **Output:** `expectedValue` = the original payment's reference; `actualValue` = this payment's reference; `metadata.originalPaymentId`, `metadata.fingerprint`.
- **Edge cases:** A payment with no other payment sharing its fingerprint (or one outside the time window) passes. The earlier payment of a genuine pair always passes this rule itself.
- **Limitations — read this before trusting the fingerprint in a real system:** **this schema has no merchant-supplied business/idempotency-key field on `Payment`.** The fingerprint is therefore a heuristic built from the next-best stable fields (customer, amount, currency, method) plus a time window, not a true idempotency check. Consequences:
  - **False positives:** two *legitimately separate* purchases of the same amount, by the same customer, using the same method, within 24 hours (e.g. two identical coffee-shop transactions) will be flagged as a possible duplicate.
  - **False negatives:** a genuine duplicate submitted more than 24 hours apart, or with a slightly different amount (e.g. retried with a different tip), will not be caught.
  - A production system should add a client-supplied idempotency key or merchant order reference and fingerprint on that instead.

## 5. Delayed settlement

**File:** `lib/reconciliation-engine/rules/delayedSettlement.ts`

- **Business purpose:** Surfaces settlements that did arrive, but later than promised — useful for tracking provider SLA performance over time even when no money is actually at risk.
- **Inputs:** `payment.expectedSettlementAt`, `settlement.settledAt`.
- **Trigger conditions:** A settlement exists, has actually settled (`settledAt` is set), and `settledAt > expectedSettlementAt`.
- **Severity logic:** `LOW` under `settlementDelay.mediumHours` (24h), `MEDIUM` up to `settlementDelay.highHours` (72h), `HIGH` at or beyond that.
- **Output:** `expectedValue`/`actualValue` = the two timestamps; `metadata.delayHours`.
- **Edge cases:** No settlement, or a settlement that hasn't settled yet (`settledAt: null`, still `PENDING`) → passes (nothing to measure yet). Settled exactly on time or early → passes.
- **Limitations:** Severity thresholds are flat across all payment methods; a SWIFT payment and a Faster Payments transfer have very different normal settlement windows in reality.

## 6. Stuck payment

**File:** `lib/reconciliation-engine/rules/stuckPayment.ts`

- **Business purpose:** Flags payments stuck in `PENDING` far longer than any normal processing time — usually an integration failure with the acquirer/processor rather than a settlement-file problem.
- **Inputs:** `payment.status`, `payment.createdAt`, `now`.
- **Trigger conditions:** `status === PENDING` and `now - createdAt >= pendingPaymentSlaHours` (48h default).
- **Severity logic:** `HIGH` once past the SLA, escalating to `CRITICAL` at 2× the SLA (96h).
- **Output:** `expectedValue` = `"<= 48h pending"`; `actualValue` = the actual elapsed pending time; `metadata.pendingHours`.
- **Edge cases:** `PROCESSING`, `COMPLETED`, `FAILED` and `REVERSED` payments never trigger this rule, even if old — only `PENDING` represents a stalled payment.
- **Limitations:** Maps to the existing `SLA_BREACH` exception type rather than a dedicated one, since the two concepts (payment stuck pending vs. SLA breached) are the same thing in this domain model. A single global SLA is used regardless of payment method.

## 7. Invalid status combination

**File:** `lib/reconciliation-engine/rules/invalidStatusCombination.ts`, matrix in `config.ts`

- **Business purpose:** Catches data-integrity defects — payment/settlement state pairs that should be structurally impossible in a healthy lifecycle (e.g. a failed payment somehow marked as settled).
- **Inputs:** `payment.status`, `settlement.status`, the central `disallowedSettlementStatusByPaymentStatus` matrix.
- **Trigger conditions:** A settlement exists and its status appears in the disallowed list for the payment's status. Current matrix: `FAILED`, `REVERSED`, `PENDING` and `PROCESSING` payments may never legitimately have a `SETTLED` settlement.
- **Severity logic:** Always `CRITICAL` — this represents a data-integrity defect, not an operational delay.
- **Output:** `expectedValue` = a description of the allowed settlement statuses; `actualValue` = the actual (invalid) settlement status; `metadata.paymentStatus`, `metadata.settlementStatus`.
- **Edge cases:** No settlement at all → passes (nothing to compare; other rules cover the no-settlement case). `COMPLETED` + `SETTLED` is explicitly allowed (the healthy path).
- **Limitations:** This schema has no `CANCELLED` payment status — `REVERSED` is used as the closest equivalent to "cancelled" throughout this rule and its seed data. The allowed-combination matrix is intentionally centralized in `config.ts` rather than scattered across rule files, per the sprint's architecture requirement, but it is still a hand-maintained list; adding a new `PaymentStatus`/`SettlementStatus` value requires remembering to update it (there is no compile-time exhaustiveness check tying the two together).

---

## Idempotency strategy

Running reconciliation repeatedly against unchanged data must never create duplicate open exceptions. The strategy:

1. Every failed rule evaluation computes a **deterministic dedupe key**: `` `${paymentId}:${settlementId ?? "none"}:${ruleType}` `` (`lib/reconciliation-engine/dedupe.ts#computeExceptionDedupeKey`).
2. Before creating an `ExceptionCase`, the persistence layer looks for an existing case with that same dedupe key whose `status` is **not** `RESOLVED` or `CLOSED`.
3. If found: the new `ReconciliationResult` is linked to that existing case (`exceptionCaseId`) and the case's `lastDetectedAt` timestamp is bumped — no new row, no duplicate.
4. If not found (first occurrence, or the previous occurrence of this exact issue was already resolved/closed): a brand-new `ExceptionCase` is created with `status: NEW` and `source: "SYSTEM"`.

**Why no database-level unique constraint on `dedupeKey`:** a resolved issue that later *recurs* (e.g. a payment gets a new, different amount-mismatched settlement after the first was corrected) should be able to open a fresh case — a hard unique index would prevent that. The idempotency guarantee is therefore enforced in application logic (`lib/reconciliation-engine/persistence.ts#persistResults`), scoped to "currently open cases with this exact key," not the full history of the key. Historical `ReconciliationResult` rows are never deleted or overwritten — only `ExceptionCase.lastDetectedAt` is updated.

Note that when a result re-links to an existing open case, only `lastDetectedAt` is refreshed — `severity`, `title` and `description` stay as they were when the case was first created, even if the current evaluation would now compute a different severity (e.g. a missing-settlement case created as `MEDIUM` that later becomes objectively `HIGH` as more time passes). This is a deliberate reading of the spec's "link the result, or update the timestamp" framing, not an oversight; each individual `ReconciliationResult` row still carries the *current* severity for that run, so the escalation is visible in the run/result history even though the `ExceptionCase` itself doesn't auto-escalate.

## Concurrency and failure recovery

`lib/reconciliation-engine/persistence.ts#startRun` performs the "is a run already in progress?" check and the creation of the new `RUNNING` row inside a single Prisma transaction, so two near-simultaneous invocations (e.g. a double-click on "Run reconciliation") can't both observe "nothing running" and both proceed — the two idempotency guarantees this document describes would otherwise be at risk of a race under genuine concurrent runs.

A run still marked `RUNNING` after `maxRunDurationMinutes` (30, see `config.ts`) is treated as abandoned — most plausibly because the server process crashed or was killed mid-run — and is automatically marked `FAILED` (with an explanatory `errorMessage`) the next time anyone tries to start a run. Without this, a single crashed run would permanently block every future reconciliation run, since the "already running" check would never see anything else. Real runs complete in well under a second at this project's data volume, so 30 minutes is a generous margin, not a performance target.

**Partial-write trade-off:** results are persisted incrementally, one `ReconciliationResult`/`ExceptionCase` write at a time, rather than inside one all-or-nothing transaction spanning the whole run. This is a deliberate choice: Prisma's interactive transactions have a default timeout (5s), and a single run can produce hundreds of writes — wrapping the entire run risks spurious timeout failures on an otherwise-healthy run, which is a worse failure mode than the rare case of a run dying mid-loop and leaving some rows committed under a run that ends up marked `FAILED`. Such a run is still clearly identifiable (status `FAILED`, an `errorMessage`, and counts that don't reflect a completed run) and — per the point above — never blocks subsequent runs.

## Configuration reference

All in `lib/reconciliation-engine/config.ts`:

| Key | Default | Used by |
| --- | --- | --- |
| `pendingPaymentSlaHours` | 48 | Stuck payment |
| `settlementGracePeriodHours` | 24 | Missing settlement severity |
| `highSeverityAmountThresholdMinor` | 5000 | Amount mismatch severity |
| `settlementDelay.mediumHours` / `.highHours` | 24 / 72 | Delayed settlement severity |
| `exceptionSlaHoursBySeverity` | LOW 168 / MEDIUM 72 / HIGH 24 / CRITICAL 4 | Exception `slaDeadline` on creation |
| `duplicatePaymentWindowHours` | 24 | Duplicate payment |
| `invalidStatusCombinations` | see rule 7 | Invalid status combination |

## Known limitations (engine-wide)

- No pagination/streaming — a run loads every payment into memory in one query. Fine at this project's scale (dozens–hundreds of rows); would need batching at real production volume.
- Rule evaluation is sequential, not parallelized, and persistence writes one row per evaluation rather than batching inserts — simple and easy to reason about, but not tuned for throughput (see the partial-write trade-off above).
- No authentication/authorization on the "Run reconciliation" action — anyone with access to the app can trigger a run. Out of scope for this sprint (no auth exists anywhere in the app yet).
- All displayed timestamps (including SLA deadlines) are rendered in `Europe/Dublin` (`lib/format.ts`), independent of the host machine/container's own timezone. The underlying comparisons in every rule are always timezone-agnostic instant (millisecond) arithmetic — only *display* is timezone-pinned.
