import { Card } from "@/components/ui/Card";
import { ExceptionSeverityBadge, ExceptionStatusBadge, ExceptionTypeBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { ExceptionCase } from "@/app/generated/prisma/client";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function ExceptionSummaryCard({ exceptionCase }: { exceptionCase: ExceptionCase }) {
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
        <Field label="Detected">{formatDateTime(exceptionCase.openedAt)}</Field>
        <Field label="Last detected">{formatDateTime(exceptionCase.lastDetectedAt)}</Field>
        <Field label="SLA deadline">{formatDateTime(exceptionCase.slaDeadline)}</Field>
        <Field label="Source">{exceptionCase.source}</Field>
      </dl>
      <p className="mt-4 text-sm text-slate-700">{exceptionCase.description}</p>
    </Card>
  );
}
