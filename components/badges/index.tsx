import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  EXCEPTION_SEVERITY_PRESENTATION,
  EXCEPTION_STATUS_PRESENTATION,
  PAYMENT_STATUS_PRESENTATION,
  SETTLEMENT_DISPLAY_STATUS_PRESENTATION,
  SETTLEMENT_STATUS_PRESENTATION,
  UAT_STATUS_PRESENTATION,
} from "@/lib/status";
import type {
  ExceptionSeverity,
  ExceptionStatus,
  PaymentStatus,
  SettlementStatus,
  UATStatus,
} from "@/app/generated/prisma/client";
import type { SettlementDisplayStatus } from "@/lib/reconciliation";

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
