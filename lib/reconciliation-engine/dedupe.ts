/**
 * Deterministic identity for an auto-created exception, used to decide whether a
 * newly-failed rule evaluation should link to an existing open exception rather
 * than creating a duplicate. See docs/RECONCILIATION_RULES.md for the full
 * idempotency strategy.
 */
export function computeExceptionDedupeKey(paymentId: string, settlementId: string | null, ruleType: string): string {
  return `${paymentId}:${settlementId ?? "none"}:${ruleType}`;
}

/**
 * Heuristic duplicate-payment fingerprint. This schema has no merchant-supplied
 * business/idempotency-key field on Payment, so the fingerprint is built from the
 * next-best stable fields: same customer, amount, currency and method. Documented
 * limitation: two legitimate, separately-intended purchases of identical amount
 * and method by the same customer within the detection window will false-positive
 * as a duplicate; a true idempotency key would remove this ambiguity entirely.
 */
export function computeDuplicatePaymentFingerprint(payment: {
  customerId: string;
  amountMinor: number;
  currency: string;
  paymentMethod: string;
}): string {
  return `${payment.customerId}:${payment.amountMinor}:${payment.currency}:${payment.paymentMethod}`;
}
