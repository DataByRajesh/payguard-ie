import { Card } from "@/components/ui/Card";
import { ExceptionSeverityBadge, ExceptionStatusBadge, ExceptionTypeBadge, SlaStateBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import { calculateSlaState } from "@/lib/exception-workflow/sla";
import type { ExceptionCase } from "@/app/generated/prisma/client";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function ExceptionSummaryCard({ exceptionCase, now = new Date() }: { exceptionCase: ExceptionCase; now?: Date }) {
  const sla = calculateSlaState({ slaDeadline: exceptionCase.slaDeadline, closedAt: exceptionCase.closedAt, now });
  const remainingHours = sla.remainingMs !== null ? (sla.remainingMs / 3_600_000).toFixed(1) : null;
  const overdueHours = sla.overdueMs !== null ? (sla.overdueMs / 3_600_000).toFixed(1) : null;

  return (
    <Card title="Exception summary">
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Field label="Case reference">{exceptionCase.caseReference}</Field>
        <Field label="Type">
          <ExceptionTypeBadge type={exceptionCase.type} />
        </Field>
        <Field label="Severity">
          <ExceptionSeverityBadge severity={exceptionCase.severity} />
        </Field>
        <Field label="Status">
          <ExceptionStatusBadge status={exceptionCase.status} />
        </Field>
        <Field label="SLA state">
          <div className="flex flex-col gap-1">
            <SlaStateBadge state={sla.state} />
            {remainingHours ? <span className="text-xs text-slate-400">{remainingHours}h remaining</span> : null}
            {overdueHours ? <span className="text-xs text-slate-400">{overdueHours}h overdue</span> : null}
          </div>
        </Field>
        <Field label="Detected">{formatDateTime(exceptionCase.openedAt)}</Field>
        <Field label="Last detected">{formatDateTime(exceptionCase.lastDetectedAt)}</Field>
        <Field label="SLA deadline">{formatDateTime(exceptionCase.slaDeadline)}</Field>
        <Field label="Source">{exceptionCase.source}</Field>
      </dl>
      <p className="mt-4 text-sm text-slate-700">{exceptionCase.description}</p>
    </Card>
  );
}
