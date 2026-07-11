import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  EXCEPTION_SEVERITY_PRESENTATION,
  EXCEPTION_STATUS_PRESENTATION,
  EXCEPTION_TYPE_PRESENTATION,
  PAYMENT_STATUS_PRESENTATION,
  RECONCILIATION_RULE_TYPE_PRESENTATION,
  RECONCILIATION_RUN_STATUS_PRESENTATION,
  RELEASE_RECOMMENDATION_PRESENTATION,
  RULE_RESULT_PRESENTATION,
  SETTLEMENT_DISPLAY_STATUS_PRESENTATION,
  SETTLEMENT_STATUS_PRESENTATION,
  SLA_STATE_PRESENTATION,
  UAT_STATUS_PRESENTATION,
} from "@/lib/status";
import type {
  ExceptionSeverity,
  ExceptionStatus,
  ExceptionType,
  PaymentStatus,
  ReconciliationRunStatus,
  SettlementStatus,
  UATStatus,
} from "@/app/generated/prisma/client";
import type { SettlementDisplayStatus } from "@/lib/reconciliation";
import type { RuleType } from "@/lib/reconciliation-engine/types";
import type { ReleaseRecommendation } from "@/lib/exception-workflow/uatRecommendation";
import type { SlaState } from "@/lib/exception-workflow/types";

export function PaymentStatusBadge({ status }: { status: PaymentStatus }) {
  const { label, tone } = PAYMENT_STATUS_PRESENTATION[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function SettlementStatusBadge({ status }: { status: SettlementStatus }) {
  const { label, tone } = SETTLEMENT_STATUS_PRESENTATION[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function SettlementDisplayStatusBadge({ status }: { status: SettlementDisplayStatus }) {
  const { label, tone } = SETTLEMENT_DISPLAY_STATUS_PRESENTATION[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function ExceptionSeverityBadge({ severity }: { severity: ExceptionSeverity }) {
  const { label, tone } = EXCEPTION_SEVERITY_PRESENTATION[severity];
  return <StatusBadge label={label} tone={tone} />;
}

export function ExceptionStatusBadge({ status }: { status: ExceptionStatus }) {
  const { label, tone } = EXCEPTION_STATUS_PRESENTATION[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function UatStatusBadge({ status }: { status: UATStatus }) {
  const { label, tone } = UAT_STATUS_PRESENTATION[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function ExceptionTypeBadge({ type }: { type: ExceptionType }) {
  const { label, tone } = EXCEPTION_TYPE_PRESENTATION[type];
  return <StatusBadge label={label} tone={tone} />;
}

export function ReconciliationRunStatusBadge({ status }: { status: ReconciliationRunStatus }) {
  const { label, tone } = RECONCILIATION_RUN_STATUS_PRESENTATION[status];
  return <StatusBadge label={label} tone={tone} />;
}

export function RuleTypeBadge({ rule }: { rule: RuleType }) {
  const { label, tone } = RECONCILIATION_RULE_TYPE_PRESENTATION[rule];
  return <StatusBadge label={label} tone={tone} />;
}

export function RuleResultBadge({ passed }: { passed: boolean }) {
  const { label, tone } = RULE_RESULT_PRESENTATION[passed ? "PASSED" : "FAILED"];
  return <StatusBadge label={label} tone={tone} />;
}

export function SlaStateBadge({ state }: { state: SlaState }) {
  const { label, tone } = SLA_STATE_PRESENTATION[state];
  return <StatusBadge label={label} tone={tone} />;
}

export function ReleaseRecommendationBadge({ recommendation }: { recommendation: ReleaseRecommendation }) {
  const { label, tone } = RELEASE_RECOMMENDATION_PRESENTATION[recommendation];
  return <StatusBadge label={label} tone={tone} />;
}
