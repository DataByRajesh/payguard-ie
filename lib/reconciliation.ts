import { PaymentStatus, SettlementStatus } from "@/app/generated/prisma/enums";

export const SETTLEMENT_DISPLAY_STATUSES = [
  "MATCHED",
  "AMOUNT_MISMATCH",
  "CURRENCY_MISMATCH",
  "DELAYED",
  "MISSING",
  "PENDING",
  "FAILED_PAYMENT",
] as const;

export type SettlementDisplayStatus = (typeof SETTLEMENT_DISPLAY_STATUSES)[number];

interface PaymentLike {
  status: PaymentStatus;
  currency: string;
  amountMinor: number;
  expectedSettlementAt: Date;
}

interface SettlementLike {
  currency: string;
  amountMinor: number;
  status: SettlementStatus;
  settledAt: Date | null;
}

/** True when a payment's expected settlement date has already passed relative to `now`. */
export function isPastSla(payment: Pick<PaymentLike, "expectedSettlementAt">, now: Date = new Date()): boolean {
  return payment.expectedSettlementAt.getTime() < now.getTime();
}

/**
 * Derives the settlement-comparison outcome for a payment/settlement pair.
 * Computed live from the two records rather than read from a stored reconciliation
 * snapshot, so the Payments/Settlements pages can never show stale results.
 */
export function deriveSettlementDisplayStatus(
  payment: PaymentLike,
  settlement: SettlementLike | null,
  now: Date = new Date(),
): SettlementDisplayStatus {
  if (payment.status === PaymentStatus.FAILED) {
    return "FAILED_PAYMENT";
  }

  if (!settlement) {
    return isPastSla(payment, now) ? "MISSING" : "PENDING";
  }

  if (settlement.currency !== payment.currency) {
    return "CURRENCY_MISMATCH";
  }

  if (settlement.amountMinor !== payment.amountMinor) {
    return "AMOUNT_MISMATCH";
  }

  if (settlement.settledAt && settlement.settledAt.getTime() > payment.expectedSettlementAt.getTime()) {
    return "DELAYED";
  }

  if (settlement.status === SettlementStatus.SETTLED) {
    return "MATCHED";
  }

  return "PENDING";
}
