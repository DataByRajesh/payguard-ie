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
import type { SlaState } from "@/lib/exception-workflow/types";

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
  ASSIGNED: { label: "Assigned", tone: "neutral" },
  INVESTIGATING: { label: "Investigating", tone: "warning" },
  AWAITING_INFORMATION: { label: "Awaiting information", tone: "warning" },
  RESOLVED: { label: "Resolved", tone: "success" },
  CLOSED: { label: "Closed", tone: "neutral" },
};

export const SLA_STATE_PRESENTATION: Record<SlaState, StatusPresentation> = {
  ON_TRACK: { label: "On track", tone: "success" },
  DUE_SOON: { label: "Due soon", tone: "warning" },
  OVERDUE: { label: "Overdue", tone: "danger" },
  COMPLETED_ON_TIME: { label: "Completed on time", tone: "success" },
  COMPLETED_LATE: { label: "Completed late", tone: "warning" },
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
  PASS: { label: "Pass", tone: "success" },
  FAIL: { label: "Fail", tone: "danger" },
  BLOCKED: { label: "Blocked", tone: "warning" },
};

export const ROOT_CAUSE_CATEGORY_LABELS: Record<string, string> = {
  PROCESSING_CONFIGURATION: "Processing configuration",
  SETTLEMENT_FILE_MISSING: "Settlement file missing",
  UPSTREAM_PROVIDER_DELAY: "Upstream provider delay",
  DUPLICATE_SUBMISSION: "Duplicate submission",
  DATA_MAPPING_ERROR: "Data mapping error",
  CURRENCY_CONFIGURATION: "Currency configuration",
  STATUS_SYNCHRONISATION: "Status synchronisation",
  MANUAL_PROCESSING_ERROR: "Manual processing error",
  UNKNOWN: "Unknown",
  OTHER: "Other",
};

export const RESOLUTION_ACTION_LABELS: Record<string, string> = {
  CORRECTIVE_SETTLEMENT_APPLIED: "Corrective settlement applied",
  PAYMENT_STATUS_CORRECTED: "Payment status corrected",
  DUPLICATE_TRANSACTION_CANCELLED: "Duplicate transaction cancelled",
  CONFIGURATION_CORRECTED: "Configuration corrected",
  UPSTREAM_PROVIDER_CONFIRMED: "Upstream provider confirmed",
  ACCEPTED_OPERATIONAL_EXCEPTION: "Accepted operational exception",
  NO_ISSUE_FOUND: "No issue found",
  OTHER: "Other",
};

export const EXCEPTION_NOTE_TYPE_LABELS: Record<string, string> = {
  INVESTIGATION: "Investigation",
  CUSTOMER_UPDATE: "Customer update",
  TECHNICAL_FINDING: "Technical finding",
  HANDOVER: "Handover",
  RESOLUTION_NOTE: "Resolution note",
};

export const RELEASE_RECOMMENDATION_PRESENTATION: Record<string, StatusPresentation> = {
  READY: { label: "Ready to release", tone: "success" },
  CONDITIONAL: { label: "Conditional", tone: "warning" },
  NOT_READY: { label: "Not ready", tone: "danger" },
};
