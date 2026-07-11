import { RECONCILIATION_CONFIG } from "../config";
import type { RuleContext, RuleEvaluation } from "../types";

/** Fires when a settlement exists but its amount does not match the payment amount, in minor units. */
export function evaluateAmountMismatch(context: RuleContext): RuleEvaluation {
  const { payment, settlement } = context;

  if (!settlement || settlement.amountMinor === payment.amountMinor) {
    return {
      rule: "AMOUNT_MISMATCH",
      passed: true,
      paymentId: payment.id,
      settlementId: settlement?.id ?? null,
      summary: "Settlement amount matches payment amount, or no settlement exists yet.",
    };
  }

  const signedDifference = settlement.amountMinor - payment.amountMinor;
  const absDifference = Math.abs(signedDifference);
  const severity = absDifference >= RECONCILIATION_CONFIG.highSeverityAmountThresholdMinor ? "HIGH" : "MEDIUM";

  return {
    rule: "AMOUNT_MISMATCH",
    passed: false,
    paymentId: payment.id,
    settlementId: settlement.id,
    severity,
    summary: `Settlement amount (${settlement.amountMinor}) differs from payment amount (${payment.amountMinor}) by ${absDifference} minor units.`,
    expectedValue: String(payment.amountMinor),
    actualValue: String(settlement.amountMinor),
    differenceMinor: signedDifference,
    metadata: { absDifference, signedDifference },
  };
}
