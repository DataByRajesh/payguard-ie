import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExceptionSummaryCard } from "@/components/exceptions/ExceptionSummaryCard";
import { TriggeringResultCard } from "@/components/exceptions/TriggeringResultCard";
import { AuditTimeline } from "@/components/exceptions/AuditTimeline";
import { CommentsAndEvidence } from "@/components/exceptions/CommentsAndEvidence";
import { PaymentSummaryCard } from "@/components/payments/PaymentSummaryCard";
import { getExceptionCaseById } from "@/lib/queries/exceptions";
import { getAuditEventsForEntity } from "@/lib/queries/audit";
import { deriveSettlementDisplayStatus } from "@/lib/reconciliation";
import { idParamSchema } from "@/lib/validation/common";

interface ExceptionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ExceptionDetailPage({ params }: ExceptionDetailPageProps) {
  const { id } = await params;
  const parsedId = idParamSchema.safeParse(id);
  if (!parsedId.success) {
    notFound();
  }

  const exceptionCase = await getExceptionCaseById(parsedId.data);
  if (!exceptionCase) {
    notFound();
  }

  const auditEvents = await getAuditEventsForEntity("EXCEPTION_CASE", exceptionCase.id);
  const triggeringResult = exceptionCase.reconciliationResults[0];
  const settlementDisplayStatus = deriveSettlementDisplayStatus(exceptionCase.payment, exceptionCase.payment.settlement);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={exceptionCase.caseReference}
        description={
          <>
            <Link href="/exceptions" className="text-slate-500 underline-offset-2 hover:underline">
              Exceptions
            </Link>{" "}
            / {exceptionCase.caseReference}
          </>
        }
      />
      <ExceptionSummaryCard exceptionCase={exceptionCase} />
      <PaymentSummaryCard
        payment={exceptionCase.payment}
        customer={exceptionCase.payment.customer}
        settlement={exceptionCase.payment.settlement}
        settlementDisplayStatus={settlementDisplayStatus}
      />
      <TriggeringResultCard result={triggeringResult} />
      <AuditTimeline events={auditEvents} />
      <CommentsAndEvidence comments={exceptionCase.comments} evidenceRecords={exceptionCase.evidenceRecords} />
    </div>
  );
}
