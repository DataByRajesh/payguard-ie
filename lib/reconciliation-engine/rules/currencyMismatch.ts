import type { RuleContext, RuleEvaluation } from "../types";

/** Fires when a settlement exists but was recorded in a different currency than the payment. */
export function evaluateCurrencyMismatch(context: RuleContext): RuleEvaluation {
  const { payment, settlement } = context;

  if (!settlement || settlement.currency === payment.currency) {
    return {
      rule: "CURRENCY_MISMATCH",
      passed: true,
      paymentId: payment.id,
      settlementId: settlement?.id ?? null,
      summary: "Settlement currency matches payment currency, or no settlement exists yet.",
    };
  }

  return {
    rule: "CURRENCY_MISMATCH",
    passed: false,
    paymentId: payment.id,
    settlementId: settlement.id,
    severity: "HIGH",
    summary: `Payment currency (${payment.currency}) differs from settlement currency (${settlement.currency}).`,
    expectedValue: payment.currency,
    actualValue: settlement.currency,
    differenceMinor: null,
    metadata: {},
  };
}
