import { RECONCILIATION_CONFIG } from "../config";
import type { RuleContext, RuleEvaluation } from "../types";

const MS_PER_HOUR = 60 * 60 * 1000;

/** Fires when a settlement exists but was recorded later than the payment's expected settlement date. */
export function evaluateDelayedSettlement(context: RuleContext): RuleEvaluation {
  const { payment, settlement } = context;

  if (!settlement || !settlement.settledAt || settlement.settledAt.getTime() <= payment.expectedSettlementAt.getTime()) {
    return {
      rule: "DELAYED_SETTLEMENT",
      passed: true,
      paymentId: payment.id,
      settlementId: settlement?.id ?? null,
      summary: "Settlement occurred on or before the expected settlement date, or has not settled yet.",
    };
  }

  const delayMs = settlement.settledAt.getTime() - payment.expectedSettlementAt.getTime();
  const delayHours = delayMs / MS_PER_HOUR;
  const { mediumHours, highHours } = RECONCILIATION_CONFIG.settlementDelay;
  const severity = delayHours >= highHours ? "HIGH" : delayHours >= mediumHours ? "MEDIUM" : "LOW";

  return {
    rule: "DELAYED_SETTLEMENT",
    passed: false,
    paymentId: payment.id,
    settlementId: settlement.id,
    severity,
    summary: `Settlement received ${delayHours.toFixed(1)}h after the expected settlement date.`,
    expectedValue: payment.expectedSettlementAt.toISOString(),
    actualValue: settlement.settledAt.toISOString(),
    differenceMinor: null,
    metadata: { delayHours: Number(delayHours.toFixed(2)) },
  };
}
