import { RECONCILIATION_CONFIG } from "../config";
import type { RuleContext, RuleEvaluation } from "../types";

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Fires when a payment completed successfully but its expected settlement date
 * has passed with no settlement on file.
 */
export function evaluateMissingSettlement(context: RuleContext): RuleEvaluation {
  const { payment, settlement, now } = context;

  if (payment.status !== "COMPLETED" || settlement) {
    return {
      rule: "MISSING_SETTLEMENT",
      passed: true,
      paymentId: payment.id,
      settlementId: settlement?.id ?? null,
      summary: "Settlement present, or payment has not completed yet.",
    };
  }

  const overdueMs = now.getTime() - payment.expectedSettlementAt.getTime();
  if (overdueMs <= 0) {
    return {
      rule: "MISSING_SETTLEMENT",
      passed: true,
      paymentId: payment.id,
      settlementId: null,
      summary: "Payment is completed and still within its expected settlement window.",
    };
  }

  const overdueHours = overdueMs / MS_PER_HOUR;
  const severity = overdueHours > RECONCILIATION_CONFIG.settlementGracePeriodHours ? "HIGH" : "MEDIUM";

  return {
    rule: "MISSING_SETTLEMENT",
    passed: false,
    paymentId: payment.id,
    settlementId: null,
    severity,
    summary: `Payment completed but no settlement received, ${overdueHours.toFixed(1)}h past its expected settlement date.`,
    expectedValue: payment.expectedSettlementAt.toISOString(),
    actualValue: null,
    differenceMinor: null,
    metadata: { overdueHours: Number(overdueHours.toFixed(2)) },
  };
}
