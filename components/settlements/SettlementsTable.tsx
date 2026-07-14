import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { SettlementStatusBadge } from "@/components/badges";
import { formatMinorUnits } from "@/lib/money";
import { formatDate } from "@/lib/format";
import type { SettlementListItem } from "@/lib/types";
import type { SupportedCurrency } from "@/lib/constants";

interface SettlementsTableProps {
  settlements: SettlementListItem[];
  hasActiveFilters: boolean;
}

export function SettlementsTable({ settlements, hasActiveFilters }: SettlementsTableProps) {
  const columns: DataTableColumn<SettlementListItem>[] = [
    {
      key: "reference",
      header: "Settlement reference",
      render: (settlement) => <span className="font-medium text-slate-900">{settlement.settlementReference}</span>,
    },
    {
      key: "payment",
      header: "Payment",
      render: (settlement) => (
        <Link
          href={`/payments/${settlement.paymentId}`}
          prefetch={false}
          className="text-slate-700 underline-offset-2 hover:underline"
        >
          {settlement.payment.paymentReference}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (settlement) => (
        <div className="flex flex-col">
          <span>{settlement.payment.customer.displayName}</span>
          <span className="text-xs text-slate-400">{settlement.payment.customer.customerRef}</span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      render: (settlement) => (
        <span className="tabular-nums">
          {formatMinorUnits(settlement.amountMinor, settlement.currency as SupportedCurrency)}
        </span>
      ),
    },
    { key: "currency", header: "Currency", render: (settlement) => settlement.currency },
    { key: "status", header: "Status", render: (settlement) => <SettlementStatusBadge status={settlement.status} /> },
    { key: "settledAt", header: "Settled", render: (settlement) => formatDate(settlement.settledAt) },
    { key: "sourceFile", header: "Source file", render: (settlement) => settlement.sourceFileReference },
  ];

  return (
    <DataTable
      caption="Settlements"
      columns={columns}
      rows={settlements}
      rowKey={(settlement) => settlement.id}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? "No settlements match your filters" : "No settlements recorded yet"}
          description={
            hasActiveFilters
              ? "Try widening your search or clearing one or more filters."
              : "Seeded settlement data will appear here once the database has been seeded."
          }
        />
      }
    />
  );
}
