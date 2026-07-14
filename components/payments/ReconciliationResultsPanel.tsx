import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExceptionSeverityBadge, RuleResultBadge, RuleTypeBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { ExceptionSeverity } from "@/app/generated/prisma/client";
import type { RuleType } from "@/lib/reconciliation-engine/types";

interface ReconciliationResultItem {
  id: string;
  ruleType: RuleType;
  passed: boolean;
  severity: ExceptionSeverity | null;
  summary: string;
  exceptionCaseId: string | null;
  createdAt: Date;
  reconciliationRun: { id: string; runReference: string; startedAt: Date };
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
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Link
                  href={`/reconciliation/${result.reconciliationRun.id}`}
                  prefetch={false}
                  className="text-sm font-medium text-slate-800 underline-offset-2 hover:underline"
                >
                  {result.reconciliationRun.runReference}
                </Link>
                <div className="flex items-center gap-2">
                  <RuleTypeBadge rule={result.ruleType} />
                  <RuleResultBadge passed={result.passed} />
                  {result.severity ? <ExceptionSeverityBadge severity={result.severity} /> : null}
                </div>
              </div>
              <p className="text-xs text-slate-500">Run at {formatDateTime(result.reconciliationRun.startedAt)}</p>
              <p className="text-sm text-slate-600">{result.summary}</p>
              {result.exceptionCaseId ? (
                <Link
                  href={`/exceptions/${result.exceptionCaseId}`}
                  prefetch={false}
                  className="text-xs font-medium text-slate-500 underline-offset-2 hover:underline"
                >
                  View linked exception
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
