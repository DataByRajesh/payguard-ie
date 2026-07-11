import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { RunReconciliationButton } from "@/components/reconciliation/RunReconciliationButton";
import { RunSummaryCard } from "@/components/reconciliation/RunSummaryCard";
import { RunsTable } from "@/components/reconciliation/RunsTable";
import { getReconciliationRuns } from "@/lib/queries/reconciliation";

export const dynamic = "force-dynamic";

export default async function ReconciliationPage() {
  const runs = await getReconciliationRuns();
  const latestRun = runs[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reconciliation"
        description="Deterministic engine that evaluates every payment against seven reconciliation rules and records the results."
        actions={<RunReconciliationButton />}
      />

      {latestRun ? (
        <RunSummaryCard run={latestRun} />
      ) : (
        <EmptyState title="No reconciliation runs yet" description="Run reconciliation to generate the first run." />
      )}

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold text-slate-900">Run history</h2>
        <RunsTable runs={runs} />
      </div>
    </div>
  );
}
