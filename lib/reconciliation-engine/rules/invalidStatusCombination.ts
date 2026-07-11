import { RECONCILIATION_CONFIG } from "../config";
import type { RuleContext, RuleEvaluation, SettlementStatusInput } from "../types";

/**
 * Fires when the payment status and settlement status combination is not possible
 * under a healthy lifecycle (e.g. a FAILED payment with a SETTLED settlement).
 * The allowed/disallowed matrix lives centrally in config.ts, not here.
 */
export function evaluateInvalidStatusCombination(context: RuleContext): RuleEvaluation {
  const { payment, settlement } = context;

  if (!settlement) {
    return {
      rule: "INVALID_STATUS_COMBINATION",
      passed: true,
      paymentId: payment.id,
      settlementId: null,
      summary: "No settlement to compare against.",
    };
  }

  const disallowed: readonly SettlementStatusInput[] | undefined =
    RECONCILIATION_CONFIG.invalidStatusCombinations.disallowedSettlementStatusByPaymentStatus[payment.status];
  const isInvalid = disallowed?.includes(settlement.status) ?? false;

  if (!isInvalid) {
    return {
      rule: "INVALID_STATUS_COMBINATION",
      passed: true,
      paymentId: payment.id,
      settlementId: settlement.id,
      summary: "Payment and settlement statuses are a valid combination.",
    };
  }

  return {
    rule: "INVALID_STATUS_COMBINATION",
    passed: false,
    paymentId: payment.id,
    settlementId: settlement.id,
    severity: "CRITICAL",
    summary: `Payment status ${payment.status} is incompatible with settlement status ${settlement.status}.`,
    expectedValue: `settlement status not in [${(disallowed ?? []).join(", ")}]`,
    actualValue: settlement.status,
    differenceMinor: null,
    metadata: { paymentStatus: payment.status, settlementStatus: settlement.status },
  };
}
