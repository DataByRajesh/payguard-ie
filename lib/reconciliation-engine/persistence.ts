import { prisma } from "@/lib/db";
import { computeExceptionDedupeKey } from "./dedupe";
import { RECONCILIATION_CONFIG } from "./config";
import type { PaymentInput, RuleEvaluation, RuleType, Severity, SettlementInput } from "./types";
import type { ReconciliationRunSummary } from "./summary";
import type { ExceptionType } from "@/app/generated/prisma/enums";
import type { Prisma } from "@/app/generated/prisma/client";

export interface LoadedPayment {
  payment: PaymentInput;
  settlement: SettlementInput | null;
}

/** Loads every payment (with its settlement, if any) as plain rule-engine input objects. */
export async function loadReconciliationInputs(): Promise<LoadedPayment[]> {
  const payments = await prisma.payment.findMany({ include: { settlement: true } });

  return payments.map((payment) => ({
    payment: {
      id: payment.id,
      customerId: payment.customerId,
      paymentReference: payment.paymentReference,
      amountMinor: payment.amountMinor,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      status: payment.status,
      createdAt: payment.createdAt,
      expectedSettlementAt: payment.expectedSettlementAt,
    },
    settlement: payment.settlement
      ? {
          id: payment.settlement.id,
          amountMinor: payment.settlement.amountMinor,
          currency: payment.settlement.currency,
          status: payment.settlement.status,
          settledAt: payment.settlement.settledAt,
        }
      : null,
  }));
}

export type StartRunResult = { status: "STARTED"; run: Awaited<ReturnType<typeof createRunRow>> } | { status: "ALREADY_RUNNING" };

async function createRunRow(tx: Prisma.TransactionClient, startedAt: Date) {
  const count = await tx.reconciliationRun.count();
  const runReference = `RUN-${String(count + 1).padStart(6, "0")}`;
  return tx.reconciliationRun.create({
    data: {
      runReference,
      status: "RUNNING",
      startedAt,
      totalPayments: 0,
      totalSettlements: 0,
      totalResults: 0,
      passedCount: 0,
      failedCount: 0,
      exceptionsCreated: 0,
      countsByRule: "{}",
      countsBySeverity: "{}",
    },
  });
}

/**
 * Atomically checks for an in-progress run and creates a new one, in a single transaction so
 * two near-simultaneous invocations (e.g. a double-click) can't both observe "no running run"
 * and both proceed — the second transaction only starts once the first has committed, so it
 * sees the row the first one created.
 *
 * A run still RUNNING after `maxRunDurationMinutes` is treated as abandoned (e.g. the server
 * process crashed mid-run) and marked FAILED here, so a single stuck row can never permanently
 * block every future run. Real runs complete in seconds at this project's data volume.
 */
export async function startRun(startedAt: Date): Promise<StartRunResult> {
  return prisma.$transaction(async (tx) => {
    const running = await tx.reconciliationRun.findFirst({ where: { status: "RUNNING" } });

    if (running) {
      const ageMinutes = (startedAt.getTime() - running.startedAt.getTime()) / (60 * 1000);
      if (ageMinutes <= RECONCILIATION_CONFIG.maxRunDurationMinutes) {
        return { status: "ALREADY_RUNNING" as const };
      }
      await tx.reconciliationRun.update({
        where: { id: running.id },
        data: {
          status: "FAILED",
          completedAt: startedAt,
          errorMessage: `Run exceeded the maximum expected duration (${RECONCILIATION_CONFIG.maxRunDurationMinutes} minutes) and was treated as abandoned.`,
        },
      });
    }

    const run = await createRunRow(tx, startedAt);
    return { status: "STARTED" as const, run };
  });
}

export async function completeRun(runId: string, summary: ReconciliationRunSummary) {
  return prisma.reconciliationRun.update({
    where: { id: runId },
    data: {
      status: "COMPLETED",
      completedAt: summary.completedAt,
      totalPayments: summary.totalPayments,
      totalSettlements: summary.totalSettlements,
      totalResults: summary.totalResults,
      passedCount: summary.passedCount,
      failedCount: summary.failedCount,
      exceptionsCreated: summary.exceptionsCreated,
      countsByRule: JSON.stringify(summary.countsByRule),
      countsBySeverity: JSON.stringify(summary.countsBySeverity),
    },
  });
}

export async function failRun(runId: string, errorMessage: string, completedAt: Date) {
  return prisma.reconciliationRun.update({
    where: { id: runId },
    data: { status: "FAILED", completedAt, errorMessage },
  });
}

const RULE_TO_EXCEPTION_TYPE: Record<RuleType, ExceptionType> = {
  MISSING_SETTLEMENT: "MISSING_SETTLEMENT",
  AMOUNT_MISMATCH: "AMOUNT_MISMATCH",
  CURRENCY_MISMATCH: "CURRENCY_MISMATCH",
  DUPLICATE_PAYMENT: "DUPLICATE_PAYMENT",
  DELAYED_SETTLEMENT: "DELAYED_SETTLEMENT",
  STUCK_PAYMENT: "SLA_BREACH",
  INVALID_STATUS_COMBINATION: "INVALID_STATUS_COMBINATION",
};

const RULE_TITLES: Record<RuleType, string> = {
  MISSING_SETTLEMENT: "Missing settlement",
  AMOUNT_MISMATCH: "Amount mismatch",
  CURRENCY_MISMATCH: "Currency mismatch",
  DUPLICATE_PAYMENT: "Possible duplicate payment",
  DELAYED_SETTLEMENT: "Delayed settlement",
  STUCK_PAYMENT: "Payment stuck pending SLA",
  INVALID_STATUS_COMBINATION: "Invalid payment/settlement status combination",
};

function severityToSlaHours(severity: Severity): number {
  return RECONCILIATION_CONFIG.exceptionSlaHoursBySeverity[severity];
}

async function nextCaseReference(): Promise<string> {
  const count = await prisma.exceptionCase.count();
  return `EXC-${String(count + 1).padStart(6, "0")}`;
}

async function createSystemExceptionCase(evaluation: Extract<RuleEvaluation, { passed: false }>, dedupeKey: string, now: Date, actorUserId: string) {
  const caseReference = await nextCaseReference();
  const slaDeadline = new Date(now.getTime() + severityToSlaHours(evaluation.severity) * 60 * 60 * 1000);

  const exceptionCase = await prisma.exceptionCase.create({
    data: {
      caseReference,
      paymentId: evaluation.paymentId,
      type: RULE_TO_EXCEPTION_TYPE[evaluation.rule],
      severity: evaluation.severity,
      status: "NEW",
      title: `${RULE_TITLES[evaluation.rule]} — ${evaluation.paymentId}`,
      description: evaluation.summary,
      dedupeKey,
      lastDetectedAt: now,
      slaDeadline,
      source: "SYSTEM",
      openedAt: now,
    },
  });

  await prisma.auditEvent.create({
    data: {
      entityType: "EXCEPTION_CASE",
      entityId: exceptionCase.id,
      action: "EXCEPTION_AUTO_CREATED",
      summary: "Exception automatically created by reconciliation run",
      actorUserId,
      createdAt: now,
    },
  });

  return exceptionCase;
}

/**
 * Persists one ReconciliationResult per rule evaluation. For failed evaluations, finds-or-creates
 * an idempotent ExceptionCase via the deterministic dedupe key (see dedupe.ts and
 * docs/RECONCILIATION_RULES.md), linking the result to it either way. Returns the number of
 * genuinely *new* exceptions created (as opposed to re-linked to an existing open one).
 */
export async function persistResults(runId: string, evaluations: RuleEvaluation[], now: Date, actorUserId: string): Promise<number> {
  let exceptionsCreated = 0;

  for (const evaluation of evaluations) {
    let exceptionCaseId: string | null = null;

    if (!evaluation.passed) {
      const dedupeKey = computeExceptionDedupeKey(evaluation.paymentId, evaluation.settlementId, evaluation.rule);
      const existing = await prisma.exceptionCase.findFirst({
        where: { dedupeKey, status: { notIn: ["RESOLVED", "CLOSED"] } },
      });

      if (existing) {
        await prisma.exceptionCase.update({ where: { id: existing.id }, data: { lastDetectedAt: now } });
        exceptionCaseId = existing.id;
      } else {
        const created = await createSystemExceptionCase(evaluation, dedupeKey, now, actorUserId);
        exceptionCaseId = created.id;
        exceptionsCreated += 1;
      }
    }

    await prisma.reconciliationResult.create({
      data: {
        reconciliationRunId: runId,
        paymentId: evaluation.paymentId,
        settlementId: evaluation.settlementId,
        ruleType: evaluation.rule,
        passed: evaluation.passed,
        severity: evaluation.passed ? null : evaluation.severity,
        summary: evaluation.summary,
        expectedValue: evaluation.passed ? null : evaluation.expectedValue,
        actualValue: evaluation.passed ? null : evaluation.actualValue,
        differenceMinor: evaluation.passed ? null : evaluation.differenceMinor,
        metadata: evaluation.metadata ? JSON.stringify(evaluation.metadata) : null,
        exceptionCaseId,
      },
    });
  }

  return exceptionsCreated;
}
