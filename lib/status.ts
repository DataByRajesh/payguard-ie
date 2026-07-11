import type {
  ExceptionSeverity,
  ExceptionStatus,
  PaymentStatus,
  SettlementStatus,
  UATStatus,
} from "@/app/generated/prisma/enums";
import type { SettlementDisplayStatus } from "@/lib/reconciliation";

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
  OPEN: { label: "Open", tone: "danger" },
  IN_PROGRESS: { label: "In progress", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const UAT_STATUS_PRESENTATION: Record<UATStatus, StatusPresentation> = {
  NOT_RUN: { label: "Not run", tone: "neutral" },
  PASSED: { label: "Passed", tone: "success" },
  FAILED: { label: "Failed", tone: "danger" },
  BLOCKED: { label: "Blocked", tone: "warning" },
};
