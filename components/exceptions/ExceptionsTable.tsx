import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExceptionSeverityBadge, ExceptionStatusBadge, ExceptionTypeBadge, SlaStateBadge } from "@/components/badges";
import { formatDate } from "@/lib/format";
import { calculateSlaState } from "@/lib/exception-workflow/sla";
import type { ExceptionCase, Payment, Settlement, User } from "@/app/generated/prisma/client";

export interface ExceptionListItem extends ExceptionCase {
  payment: Payment & { settlement: Settlement | null };
  assignedUser: User | null;
}

export function ExceptionsTable({
  exceptions,
  hasActiveFilters,
  now = new Date(),
}: {
  exceptions: ExceptionListItem[];
  hasActiveFilters: boolean;
  now?: Date;
}) {
  const columns: DataTableColumn<ExceptionListItem>[] = [
    {
      key: "reference",
      header: "Case reference",
      render: (exceptionCase) => (
        <Link
          href={`/exceptions/${exceptionCase.id}`}
          // Every page here is dynamic (reads the session cookie), so prefetching every row's link
          // can't be cached and starves out the fetch carrying a Server Action's own response
          // under load -- same reasoning as components/layout/NavLink.tsx.
          prefetch={false}
          className="font-medium text-slate-900 underline-offset-2 hover:underline"
        >
          {exceptionCase.caseReference}
        </Link>
      ),
    },
    { key: "title", header: "Title", render: (exceptionCase) => exceptionCase.title },
    { key: "type", header: "Type", render: (exceptionCase) => <ExceptionTypeBadge type={exceptionCase.type} /> },
    { key: "severity", header: "Severity", render: (exceptionCase) => <ExceptionSeverityBadge severity={exceptionCase.severity} /> },
    { key: "status", header: "Status", render: (exceptionCase) => <ExceptionStatusBadge status={exceptionCase.status} /> },
    { key: "owner", header: "Owner", render: (exceptionCase) => exceptionCase.assignedUser?.name ?? "Unassigned" },
    {
      key: "payment",
      header: "Payment",
      render: (exceptionCase) => (
        <Link href={`/payments/${exceptionCase.paymentId}`} prefetch={false} className="text-slate-700 underline-offset-2 hover:underline">
          {exceptionCase.payment.paymentReference}
        </Link>
      ),
    },
    { key: "detected", header: "Detected", render: (exceptionCase) => formatDate(exceptionCase.openedAt) },
    {
      key: "sla",
      header: "SLA",
      render: (exceptionCase) => (
        <SlaStateBadge state={calculateSlaState({ slaDeadline: exceptionCase.slaDeadline, closedAt: exceptionCase.closedAt, now }).state} />
      ),
    },
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
