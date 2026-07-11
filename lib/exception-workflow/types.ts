// Pure types for the exception lifecycle domain layer. Deliberately independent of the
// Prisma-generated enums (which this layer must never import) so domain logic stays
// portable and trivially unit-testable.

export const EXCEPTION_STATUSES = [
  "NEW",
  "ASSIGNED",
  "INVESTIGATING",
  "AWAITING_INFORMATION",
  "RESOLVED",
  "CLOSED",
] as const;
export type ExceptionStatusValue = (typeof EXCEPTION_STATUSES)[number];

export const SLA_STATES = ["ON_TRACK", "DUE_SOON", "OVERDUE", "COMPLETED_ON_TIME", "COMPLETED_LATE"] as const;
export type SlaState = (typeof SLA_STATES)[number];

export const ROOT_CAUSE_CATEGORIES = [
  "PROCESSING_CONFIGURATION",
  "SETTLEMENT_FILE_MISSING",
  "UPSTREAM_PROVIDER_DELAY",
  "DUPLICATE_SUBMISSION",
  "DATA_MAPPING_ERROR",
  "CURRENCY_CONFIGURATION",
  "STATUS_SYNCHRONISATION",
  "MANUAL_PROCESSING_ERROR",
  "UNKNOWN",
  "OTHER",
] as const;
export type RootCauseCategoryValue = (typeof ROOT_CAUSE_CATEGORIES)[number];

export const RESOLUTION_ACTIONS = [
  "CORRECTIVE_SETTLEMENT_APPLIED",
  "PAYMENT_STATUS_CORRECTED",
  "DUPLICATE_TRANSACTION_CANCELLED",
  "CONFIGURATION_CORRECTED",
  "UPSTREAM_PROVIDER_CONFIRMED",
  "ACCEPTED_OPERATIONAL_EXCEPTION",
  "NO_ISSUE_FOUND",
  "OTHER",
] as const;
export type ResolutionActionValue = (typeof RESOLUTION_ACTIONS)[number];

export const APPROVAL_DECISIONS = ["APPROVED", "REJECTED"] as const;
export type ApprovalDecisionValue = (typeof APPROVAL_DECISIONS)[number];

export const EXCEPTION_NOTE_TYPES = [
  "INVESTIGATION",
  "CUSTOMER_UPDATE",
  "TECHNICAL_FINDING",
  "HANDOVER",
  "RESOLUTION_NOTE",
] as const;
export type ExceptionNoteTypeValue = (typeof EXCEPTION_NOTE_TYPES)[number];

export const UAT_STATUSES = ["NOT_RUN", "PASS", "FAIL", "BLOCKED"] as const;
export type UatStatusValue = (typeof UAT_STATUSES)[number];

export const EVIDENCE_TYPES = ["SCREENSHOT", "LOG_EXTRACT", "QUERY_RESULT", "SIGN_OFF_DOCUMENT", "OTHER"] as const;
export type EvidenceTypeValue = (typeof EVIDENCE_TYPES)[number];

export interface ReadinessResult {
  ready: boolean;
  reasons: string[];
}
