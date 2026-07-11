import type { PaymentStatusInput, SettlementStatusInput } from "./types";

/**
 * Single source of truth for every reconciliation threshold. Rules read from
 * here rather than hard-coding numbers so tuning behaviour never requires
 * touching rule logic.
 */
export const RECONCILIATION_CONFIG = {
  /** How long a PENDING payment may sit before the stuck-payment rule fires. */
  pendingPaymentSlaHours: 48,
  /** Grace period after expectedSettlementAt before a missing settlement is escalated to HIGH. */
  settlementGracePeriodHours: 24,
  /** Absolute amount difference (minor units) at/above which an amount mismatch is HIGH rather than MEDIUM. */
  highSeverityAmountThresholdMinor: 5000,
  /** Delay thresholds (hours past expectedSettlementAt) for settlement-delay severity. */
  settlementDelay: {
    mediumHours: 24,
    highHours: 72,
  },
  /** SLA (hours) an auto-created exception gets before breach, by severity. */
  exceptionSlaHoursBySeverity: {
    LOW: 168,
    MEDIUM: 72,
    HIGH: 24,
    CRITICAL: 4,
  },
  /** Window within which two payments with an identical fingerprint are considered a possible duplicate. */
  duplicatePaymentWindowHours: 24,
  /**
   * A run still marked RUNNING after this many minutes is treated as abandoned (e.g. the
   * process crashed mid-run) rather than genuinely in progress, so a single stuck run can
   * never permanently block every future reconciliation run. Real runs complete in seconds
   * at this project's data volume, so this is a generous margin, not a performance target.
   */
  maxRunDurationMinutes: 30,
  /**
   * Central allowed-combination matrix for the invalid-status-combination rule.
   * Keyed by payment status; value is the list of settlement statuses that are
   * NOT valid to see alongside that payment status. `REVERSED` stands in for a
   * "cancelled" payment concept, since this schema has no CANCELLED status.
   */
  invalidStatusCombinations: {
    disallowedSettlementStatusByPaymentStatus: {
      FAILED: ["SETTLED"],
      REVERSED: ["SETTLED"],
      PENDING: ["SETTLED"],
      PROCESSING: ["SETTLED"],
    } as Partial<Record<PaymentStatusInput, SettlementStatusInput[]>>,
  },
} as const;
