import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentSummaryCard } from "@/components/payments/PaymentSummaryCard";
import { ReconciliationResultsPanel } from "@/components/payments/ReconciliationResultsPanel";
import { ExceptionCasePanel } from "@/components/payments/ExceptionCasePanel";
import { AuditTimeline } from "@/components/exceptions/AuditTimeline";
import { getPaymentById } from "@/lib/queries/payments";
import { getAuditEventsForEntity } from "@/lib/queries/audit";

interface PaymentDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PaymentDetailPage({ params }: PaymentDetailPageProps) {
  const { id } = await params;
  const payment = await getPaymentById(id);

  if (!payment) {
    notFound();
  }

  const auditEvents = await getAuditEventsForEntity("PAYMENT", payment.id);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={payment.paymentReference}
        description={
          <>
            <Link href="/payments" className="text-slate-500 underline-offset-2 hover:underline">
              Payments
            </Link>{" "}
            / {payment.paymentReference}
          </>
        }
      />
      <PaymentSummaryCard
        payment={payment}
        customer={payment.customer}
        settlement={payment.settlement}
        settlementDisplayStatus={payment.settlementDisplayStatus}
      />
      <ReconciliationResultsPanel results={payment.reconciliationResults} />
      <ExceptionCasePanel exceptionCases={payment.exceptionCases} />
      <AuditTimeline events={auditEvents} />
    </div>
  );
}
