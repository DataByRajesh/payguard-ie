import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PaymentStatusBadge, SettlementDisplayStatusBadge, SettlementStatusBadge } from "@/components/badges";
import { formatMinorUnits } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { PAYMENT_METHOD_LABELS, type PaymentMethod, type SupportedCurrency } from "@/lib/constants";
import type { Customer, Payment, Settlement } from "@/app/generated/prisma/client";
import type { SettlementDisplayStatus } from "@/lib/reconciliation";

interface PaymentSummaryCardProps {
  payment: Payment;
  customer: Customer;
  settlement: Settlement | null;
  settlementDisplayStatus: SettlementDisplayStatus;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function PaymentSummaryCard({ payment, customer, settlement, settlementDisplayStatus }: PaymentSummaryCardProps) {
  const currency = payment.currency as SupportedCurrency;
  const isDelayed = settlementDisplayStatus === "DELAYED";

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card title="Payment summary">
        <dl className="grid grid-cols-2 gap-4">
          <Field label="Payment reference">{payment.paymentReference}</Field>
          <Field label="Status">
            <PaymentStatusBadge status={payment.status} />
          </Field>
          <Field label="Customer">
            <div className="flex flex-col">
              <span>{customer.displayName}</span>
              <span className="text-xs text-slate-400">{customer.customerRef}</span>
            </div>
          </Field>
          <Field label="Amount">{formatMinorUnits(payment.amountMinor, currency)}</Field>
          <Field label="Method">{PAYMENT_METHOD_LABELS[payment.paymentMethod as PaymentMethod] ?? payment.paymentMethod}</Field>
          <Field label="Created">{formatDateTime(payment.createdAt)}</Field>
          <Field label="Last updated">{formatDateTime(payment.updatedAt)}</Field>
        </dl>
      </Card>

      <Card title="Settlement">
        {settlement ? (
          <dl className="grid grid-cols-2 gap-4">
            <Field label="Settlement reference">{settlement.settlementReference}</Field>
            <Field label="Status">
              <SettlementStatusBadge status={settlement.status} />
            </Field>
            <Field label="Amount">{formatMinorUnits(settlement.amountMinor, settlement.currency as SupportedCurrency)}</Field>
            <Field label="Source file">{settlement.sourceFileReference}</Field>
            <Field label="Expected settlement">{formatDateTime(payment.expectedSettlementAt)}</Field>
            <Field label="Actual settlement">
              <span className={isDelayed ? "font-medium text-amber-700" : undefined}>
                {formatDateTime(settlement.settledAt)}
              </span>
            </Field>
            <Field label="Reconciliation outcome">
              <SettlementDisplayStatusBadge status={settlementDisplayStatus} />
            </Field>
          </dl>
        ) : (
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-4">
              <Field label="Expected settlement">{formatDateTime(payment.expectedSettlementAt)}</Field>
              <Field label="Reconciliation outcome">
                <SettlementDisplayStatusBadge status={settlementDisplayStatus} />
              </Field>
            </dl>
            <EmptyState
              title="No settlement recorded"
              description="No settlement file has matched this payment yet."
            />
          </div>
        )}
      </Card>
    </div>
  );
}
