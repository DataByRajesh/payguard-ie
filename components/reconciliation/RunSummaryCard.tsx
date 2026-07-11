import { Card } from "@/components/ui/Card";
import { ReconciliationRunStatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { ReconciliationRun } from "@/app/generated/prisma/client";

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "—";
  return `${((completedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)}s`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function RunSummaryCard({ run }: { run: ReconciliationRun }) {
  const countsByRule = JSON.parse(run.countsByRule) as Record<string, number>;
  const countsBySeverity = JSON.parse(run.countsBySeverity) as Record<string, number>;

  return (
    <Card title={`Run ${run.runReference}`}>
      <div className="flex flex-col gap-4">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Status">
            <ReconciliationRunStatusBadge status={run.status} />
          </Field>
          <Field label="Started">{formatDateTime(run.startedAt)}</Field>
          <Field label="Completed">{formatDateTime(run.completedAt)}</Field>
          <Field label="Duration">{formatDuration(run.startedAt, run.completedAt)}</Field>
          <Field label="Payments evaluated">{run.totalPayments}</Field>
          <Field label="Passed / Failed">
            {run.passedCount} / {run.failedCount}
          </Field>
          <Field label="Exceptions created">{run.exceptionsCreated}</Field>
        </dl>

        {run.errorMessage ? <p className="text-sm text-rose-700">{run.errorMessage}</p> : null}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Results by rule</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
              {Object.entries(countsByRule).map(([rule, count]) => (
                <li key={rule} className="flex justify-between gap-4">
                  <span>{rule.replaceAll("_", " ")}</span>
                  <span className="tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Failures by severity</h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-slate-700">
              {Object.entries(countsBySeverity).map(([severity, count]) => (
                <li key={severity} className="flex justify-between gap-4">
                  <span>{severity}</span>
                  <span className="tabular-nums">{count}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
}
