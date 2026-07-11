import { RECONCILIATION_CONFIG } from "../config";
import { computeDuplicatePaymentFingerprint } from "../dedupe";
import type { RuleContext, RuleEvaluation } from "../types";

const MS_PER_HOUR = 60 * 60 * 1000;

/**
 * Fires when another payment with the same customer/amount/currency/method fingerprint
 * was created within the duplicate-detection window. Only the *later* payment of a
 * matching pair is flagged, so a genuine duplicate produces exactly one exception.
 * See docs/RECONCILIATION_RULES.md for the fingerprint's known limitations.
 */
export function evaluateDuplicatePayment(context: RuleContext): RuleEvaluation {
  const { payment, settlement, allPayments } = context;
  const fingerprint = computeDuplicatePaymentFingerprint(payment);
  const windowMs = RECONCILIATION_CONFIG.duplicatePaymentWindowHours * MS_PER_HOUR;

  const earlierMatches = allPayments
    .filter((candidate) => candidate.id !== payment.id)
    .filter((candidate) => computeDuplicatePaymentFingerprint(candidate) === fingerprint)
    .filter((candidate) => candidate.createdAt.getTime() < payment.createdAt.getTime())
    .filter((candidate) => payment.createdAt.getTime() - candidate.createdAt.getTime() <= windowMs)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const original = earlierMatches[0];

  if (!original) {
    return {
      rule: "DUPLICATE_PAYMENT",
      passed: true,
      paymentId: payment.id,
      settlementId: settlement?.id ?? null,
      summary: "No matching payment found within the duplicate-detection window.",
    };
  }

  return {
    rule: "DUPLICATE_PAYMENT",
    passed: false,
    paymentId: payment.id,
    settlementId: settlement?.id ?? null,
    severity: "CRITICAL",
    summary: `Matches customer, amount, currency and method of ${original.paymentReference}, submitted within ${RECONCILIATION_CONFIG.duplicatePaymentWindowHours}h.`,
    expectedValue: original.paymentReference,
    actualValue: payment.paymentReference,
    differenceMinor: null,
    metadata: { originalPaymentId: original.id, fingerprint },
  };
}
