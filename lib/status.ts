import type {
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
  PaymentStatus,
  ReconciliationRunStatus,
  SettlementStatus,
  UATStatus,
} from "@/app/generated/prisma/enums";
import type { SettlementDisplayStatus } from "@/lib/reconciliation";
import type { RuleType } from "@/lib/reconciliation-engine/types";

export type BadgeTone = "neutral" | "info" | "success" | "warning" | "danger";

export interface StatusPresentation {
  label: string;
  tone: BadgeTone;
}

export const PAYMENT_STATUS_PRESENTATION: Record<PaymentStatus, StatusPresentation> = {
  PENDING: { label: "Pending", tone: "neutral" },
  PROCESSING: { label: "Processing", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  REVERSED: { label: "Reversed", tone: "warning" },
};

export const SETTLEMENT_STATUS_PRESENTATION: Record<SettlementStatus, StatusPresentation> = {
  PENDING: { label: "Pending", tone: "neutral" },
  SETTLED: { label: "Settled", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  REVERSED: { label: "Reversed", tone: "warning" },
};

export const SETTLEMENT_DISPLAY_STATUS_PRESENTATION: Record<SettlementDisplayStatus, StatusPresentation> = {
  MATCHED: { label: "Matched", tone: "success" },
  AMOUNT_MISMATCH: { label: "Amount mismatch", tone: "danger" },
  CURRENCY_MISMATCH: { label: "Currency mismatch", tone: "danger" },
  DELAYED: { label: "Delayed", tone: "warning" },
  MISSING: { label: "Missing", tone: "danger" },
  PENDING: { label: "Pending", tone: "neutral" },
  FAILED_PAYMENT: { label: "Payment failed", tone: "danger" },
};

export const EXCEPTION_SEVERITY_PRESENTATION: Record<ExceptionSeverity, StatusPresentation> = {
  LOW: { label: "Low", tone: "neutral" },
  MEDIUM: { label: "Medium", tone: "info" },
  HIGH: { label: "High", tone: "warning" },
  CRITICAL: { label: "Critical", tone: "danger" },
};

export const EXCEPTION_STATUS_PRESENTATION: Record<ExceptionStatus, StatusPresentation> = {
  NEW: { label: "New", tone: "info" },
  OPEN: { label: "Open", tone: "danger" },
  IN_PROGRESS: { label: "In progress", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const EXCEPTION_TYPE_PRESENTATION: Record<ExceptionType, StatusPresentation> = {
  AMOUNT_MISMATCH: { label: "Amount mismatch", tone: "neutral" },
  CURRENCY_MISMATCH: { label: "Currency mismatch", tone: "neutral" },
  DUPLICATE_PAYMENT: { label: "Duplicate payment", tone: "neutral" },
  MISSING_SETTLEMENT: { label: "Missing settlement", tone: "neutral" },
  DELAYED_SETTLEMENT: { label: "Delayed settlement", tone: "neutral" },
  SLA_BREACH: { label: "SLA breach", tone: "neutral" },
  INVALID_STATUS_COMBINATION: { label: "Invalid status combination", tone: "neutral" },
};

export const RECONCILIATION_RUN_STATUS_PRESENTATION: Record<ReconciliationRunStatus, StatusPresentation> = {
  RUNNING: { label: "Running", tone: "info" },
  COMPLETED: { label: "Completed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
};

export const RECONCILIATION_RULE_TYPE_PRESENTATION: Record<RuleType, StatusPresentation> = {
  MISSING_SETTLEMENT: { label: "Missing settlement", tone: "neutral" },
  AMOUNT_MISMATCH: { label: "Amount mismatch", tone: "neutral" },
  CURRENCY_MISMATCH: { label: "Currency mismatch", tone: "neutral" },
  DUPLICATE_PAYMENT: { label: "Duplicate payment", tone: "neutral" },
  DELAYED_SETTLEMENT: { label: "Delayed settlement", tone: "neutral" },
  STUCK_PAYMENT: { label: "Stuck payment", tone: "neutral" },
  INVALID_STATUS_COMBINATION: { label: "Invalid status combination", tone: "neutral" },
};

export const RULE_RESULT_PRESENTATION: Record<"PASSED" | "FAILED", StatusPresentation> = {
  PASSED: { label: "Passed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
};

export const UAT_STATUS_PRESENTATION: Record<UATStatus, StatusPresentation> = {
  NOT_RUN: { label: "Not run", tone: "neutral" },
  PASSED: { label: "Passed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  BLOCKED: { label: "Blocked", tone: "warning" },
};
