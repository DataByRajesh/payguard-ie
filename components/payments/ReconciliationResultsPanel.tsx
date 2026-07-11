import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettlementDisplayStatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { SettlementDisplayStatus } from "@/lib/reconciliation";

interface ReconciliationResultItem {
  id: string;
  outcome: string;
  notes: string | null;
  createdAt: Date;
  reconciliationRun: { runReference: string; runAt: Date };
}

export function ReconciliationResultsPanel({ results }: { results: ReconciliationResultItem[] }) {
  return (
    <Card title="Reconciliation results">
      {results.length === 0 ? (
        <EmptyState
          title="No reconciliation results yet"
          description="This payment has not been included in a reconciliation run."
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {results.map((result) => (
            <li key={result.id} className="flex flex-col gap-1 rounded-md border border-slate-200 p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">{result.reconciliationRun.runReference}</span>
                <SettlementDisplayStatusBadge status={result.outcome as SettlementDisplayStatus} />
              </div>
              <p className="text-xs text-slate-500">Run at {formatDateTime(result.reconciliationRun.runAt)}</p>
              {result.notes ? <p className="text-sm text-slate-600">{result.notes}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
