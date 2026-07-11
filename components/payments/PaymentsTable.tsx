import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentStatusBadge, SettlementDisplayStatusBadge } from "@/components/badges";
import { formatMinorUnits } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from "@/lib/constants";
import type { PaymentListItem } from "@/lib/types";
import type { SupportedCurrency } from "@/lib/constants";

interface PaymentsTableProps {
  payments: PaymentListItem[];
  hasActiveFilters: boolean;
}

export function PaymentsTable({ payments, hasActiveFilters }: PaymentsTableProps) {
  const columns: DataTableColumn<PaymentListItem>[] = [
    {
      key: "reference",
      header: "Payment reference",
      render: (payment) => (
        <Link href={`/payments/${payment.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
          {payment.paymentReference}
        </Link>
      ),
    },
    {
      key: "customer",
      header: "Customer",
      render: (payment) => (
        <div className="flex flex-col">
          <span>{payment.customer.displayName}</span>
          <span className="text-xs text-slate-400">{payment.customer.customerRef}</span>
        </div>
      ),
    },
    {
      key: "amount",
      header: "Amount",
      className: "text-right",
      render: (payment) => (
        <span className="tabular-nums">{formatMinorUnits(payment.amountMinor, payment.currency as SupportedCurrency)}</span>
      ),
    },
    { key: "currency", header: "Currency", render: (payment) => payment.currency },
    {
      key: "method",
      header: "Method",
      render: (payment) => PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod] ?? payment.paymentMethod,
    },
    { key: "status", header: "Status", render: (payment) => <PaymentStatusBadge status={payment.status} /> },
    {
      key: "settlementStatus",
      header: "Settlement status",
      render: (payment) => <SettlementDisplayStatusBadge status={payment.settlementDisplayStatus} />,
    },
    { key: "createdAt", header: "Created", render: (payment) => formatDate(payment.createdAt) },
    {
      key: "expectedSettlementAt",
      header: "Expected settlement",
      render: (payment) => formatDate(payment.expectedSettlementAt),
    },
  ];

  return (
    <DataTable
      caption="Payments"
      columns={columns}
      rows={payments}
      rowKey={(payment) => payment.id}
      emptyState={
        <EmptyState
          title={hasActiveFilters ? "No payments match your filters" : "No payments recorded yet"}
          description={
            hasActiveFilters
              ? "Try widening your search or clearing one or more filters."
              : "Seeded payment data will appear here once the database has been seeded."
          }
        />
      }
    />
  );
}
