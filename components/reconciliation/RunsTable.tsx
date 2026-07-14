import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ReconciliationRunStatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { ReconciliationRun } from "@/app/generated/prisma/client";

function formatDuration(startedAt: Date, completedAt: Date | null): string {
  if (!completedAt) return "—";
  return `${((completedAt.getTime() - startedAt.getTime()) / 1000).toFixed(1)}s`;
}

export function RunsTable({ runs }: { runs: ReconciliationRun[] }) {
  const columns: DataTableColumn<ReconciliationRun>[] = [
    {
      key: "reference",
      header: "Run reference",
      render: (run) => (
        <Link href={`/reconciliation/${run.id}`} prefetch={false} className="font-medium text-slate-900 underline-offset-2 hover:underline">
          {run.runReference}
        </Link>
      ),
    },
    { key: "status", header: "Status", render: (run) => <ReconciliationRunStatusBadge status={run.status} /> },
    { key: "started", header: "Started", render: (run) => formatDateTime(run.startedAt) },
    { key: "completed", header: "Completed", render: (run) => formatDateTime(run.completedAt) },
    { key: "duration", header: "Duration", render: (run) => formatDuration(run.startedAt, run.completedAt) },
    { key: "payments", header: "Payments", className: "text-right", render: (run) => run.totalPayments },
    { key: "exceptions", header: "Exceptions", className: "text-right", render: (run) => run.exceptionsCreated },
  ];

  return (
    <DataTable
      caption="Reconciliation runs"
      columns={columns}
      rows={runs}
      rowKey={(run) => run.id}
      emptyState={<EmptyState title="No reconciliation runs yet" description="Run reconciliation to generate the first run." />}
    />
  );
}
