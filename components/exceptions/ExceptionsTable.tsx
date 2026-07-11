import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExceptionSeverityBadge, ExceptionStatusBadge, ExceptionTypeBadge } from "@/components/badges";
import { formatDate } from "@/lib/format";
import type { ExceptionCase, Payment, Settlement } from "@/app/generated/prisma/client";

export interface ExceptionListItem extends ExceptionCase {
  payment: Payment & { settlement: Settlement | null };
}

export function ExceptionsTable({
  exceptions,
  hasActiveFilters,
}: {
  exceptions: ExceptionListItem[];
  hasActiveFilters: boolean;
}) {
  const columns: DataTableColumn<ExceptionListItem>[] = [
    {
      key: "reference",
      header: "Case reference",
      render: (exceptionCase) => (
        <Link href={`/exceptions/${exceptionCase.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
          {exceptionCase.caseReference}
        </Link>
      ),
    },
    { key: "title", header: "Title", render: (exceptionCase) => exceptionCase.title },
    { key: "type", header: "Type", render: (exceptionCase) => <ExceptionTypeBadge type={exceptionCase.type} /> },
    { key: "severity", header: "Severity", render: (exceptionCase) => <ExceptionSeverityBadge severity={exceptionCase.severity} /> },
    { key: "status", header: "Status", render: (exceptionCase) => <ExceptionStatusBadge status={exceptionCase.status} /> },
    {
      key: "payment",
      header: "Payment",
      render: (exceptionCase) => (
        <Link href={`/payments/${exceptionCase.paymentId}`} className="text-slate-700 underline-offset-2 hover:underline">
          {exceptionCase.payment.paymentReference}
        </Link>
      ),
    },
    {
      key: "settlement",
      header: "Settlement",
      render: (exceptionCase) => exceptionCase.payment.settlement?.settlementReference ?? "—",
    },
    { key: "detected", header: "Detected", render: (exceptionCase) => formatDate(exceptionCase.openedAt) },
    { key: "slaDeadline", header: "SLA deadline", render: (exceptionCase) => formatDate(exceptionCase.slaDeadline) },
  ];

  return (
    <DataTable
      caption="Exceptions"
      columns={columns}
      rows={exceptions}
      rowKey={(exceptionCase) => exceptionCase.id}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? "No exceptions match your filters" : "No exception cases yet"}
          description={
            hasActiveFilters
              ? "Try widening your search or clearing one or more filters."
              : "Exception cases will appear here once reconciliation has run."
          }
        />
      }
    />
  );
}
