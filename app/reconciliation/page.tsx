import { PlaceholderPage } from "@/components/placeholders/PlaceholderPage";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import { getLatestReconciliationRun } from "@/lib/queries/reconciliation";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const run = await getLatestReconciliationRun();

  return (
    <PlaceholderPage
      title="Reconciliation"
      description="Automated matching between payments and settlement files. In Sprint 1, settlement status is derived live on the Payments page; this area will host the scheduled matching engine and run history."
      upcoming={[
        "Scheduled and on-demand reconciliation runs against incoming settlement files",
        "Configurable matching rules and tolerance thresholds",
        "Run history with drill-down into every comparison outcome",
      ]}
      preview={
        <Card title="Most recent simulated run (seed data preview)">
          {run ? (
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Run reference</dt>
                <dd className="text-sm text-slate-800">{run.runReference}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Run at</dt>
                <dd className="text-sm text-slate-800">{formatDateTime(run.runAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Matched</dt>
                <dd className="text-sm text-slate-800">
                  {run.matchedCount} / {run.totalPayments}
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Exceptions</dt>
                <dd className="text-sm text-slate-800">{run.exceptionCount}</dd>
              </div>
            </dl>
          ) : (
            <EmptyState title="No reconciliation runs yet" description="Seed the database to see preview data." />
          )}
        </Card>
      }
    />
  );
}
