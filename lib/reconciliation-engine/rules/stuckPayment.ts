import { RECONCILIATION_CONFIG } from "../config";
import type { RuleContext, RuleEvaluation } from "../types";

const MS_PER_HOUR = 60 * 60 * 1000;

/** Fires when a payment has remained PENDING past the configured pending-payment SLA. */
export function evaluateStuckPayment(context: RuleContext): RuleEvaluation {
  const { payment, now } = context;

  if (payment.status !== "PENDING") {
    return {
      rule: "STUCK_PAYMENT",
      passed: true,
      paymentId: payment.id,
      settlementId: null,
      summary: "Payment is not in a pending state.",
    };
  }

  const pendingHours = (now.getTime() - payment.createdAt.getTime()) / MS_PER_HOUR;
  if (pendingHours < RECONCILIATION_CONFIG.pendingPaymentSlaHours) {
    return {
      rule: "STUCK_PAYMENT",
      passed: true,
      paymentId: payment.id,
      settlementId: null,
      summary: "Payment is pending but still within the pending-payment SLA.",
    };
  }

  const severity = pendingHours >= RECONCILIATION_CONFIG.pendingPaymentSlaHours * 2 ? "CRITICAL" : "HIGH";

  return {
    rule: "STUCK_PAYMENT",
    passed: false,
    paymentId: payment.id,
    settlementId: null,
    severity,
    summary: `Payment has been pending for ${pendingHours.toFixed(1)}h, past the ${RECONCILIATION_CONFIG.pendingPaymentSlaHours}h pending-payment SLA.`,
    expectedValue: `<= ${RECONCILIATION_CONFIG.pendingPaymentSlaHours}h pending`,
    actualValue: `${pendingHours.toFixed(1)}h pending`,
    differenceMinor: null,
    metadata: { pendingHours: Number(pendingHours.toFixed(2)) },
  };
}
