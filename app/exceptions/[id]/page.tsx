import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ExceptionSummaryCard } from "@/components/exceptions/ExceptionSummaryCard";
import { TriggeringResultCard } from "@/components/exceptions/TriggeringResultCard";
import { AuditTimeline } from "@/components/exceptions/AuditTimeline";
import { NotesPanel } from "@/components/exceptions/NotesPanel";
import { EvidencePanel } from "@/components/exceptions/EvidencePanel";
import { OwnerAndActionsCard } from "@/components/exceptions/OwnerAndActionsCard";
import { RootCauseCard } from "@/components/exceptions/RootCauseCard";
import { ResolutionCard } from "@/components/exceptions/ResolutionCard";
import { ApprovalCard } from "@/components/exceptions/ApprovalCard";
import { PaymentSummaryCard } from "@/components/payments/PaymentSummaryCard";
import { getExceptionCaseById } from "@/lib/queries/exceptions";
import { getAuditEventsForEntity } from "@/lib/queries/audit";
import { getAssignableUsers, getActingUser } from "@/lib/acting-user";
import { deriveSettlementDisplayStatus } from "@/lib/reconciliation";
import { idParamSchema } from "@/lib/validation/common";

interface ExceptionDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

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

  const [auditEvents, users, actingUser] = await Promise.all([
    getAuditEventsForEntity("EXCEPTION_CASE", exceptionCase.id),
    getAssignableUsers(),
    getActingUser(),
  ]);
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <PaymentSummaryCard
          payment={exceptionCase.payment}
          customer={exceptionCase.payment.customer}
          settlement={exceptionCase.payment.settlement}
          settlementDisplayStatus={settlementDisplayStatus}
        />
        <OwnerAndActionsCard
          exceptionId={exceptionCase.id}
          version={exceptionCase.version}
          status={exceptionCase.status}
          assignedUser={exceptionCase.assignedUser}
          users={users}
        />
      </div>

      <TriggeringResultCard result={triggeringResult} />

      <RootCauseCard
        exceptionId={exceptionCase.id}
        version={exceptionCase.version}
        status={exceptionCase.status}
        rootCauseCategory={exceptionCase.rootCauseCategory}
        rootCauseSummary={exceptionCase.rootCauseSummary}
        rootCauseIdentifiedByName={exceptionCase.rootCauseIdentifiedByUser?.name ?? null}
        rootCauseIdentifiedAt={exceptionCase.rootCauseIdentifiedAt}
      />

      <ResolutionCard
        exceptionId={exceptionCase.id}
        version={exceptionCase.version}
        status={exceptionCase.status}
        hasRootCause={Boolean(exceptionCase.rootCauseCategory)}
        hasOwner={Boolean(exceptionCase.assignedUserId)}
        resolutionAction={exceptionCase.resolutionAction}
        resolutionSummary={exceptionCase.resolutionSummary}
        resolutionUserName={exceptionCase.resolutionUser?.name ?? null}
        resolutionAt={exceptionCase.resolutionAt}
      />

      <ApprovalCard
        exceptionId={exceptionCase.id}
        version={exceptionCase.version}
        status={exceptionCase.status}
        evidenceCount={exceptionCase.evidenceRecords.length}
        resolutionUserId={exceptionCase.resolutionUserId}
        actingUserId={actingUser.id}
        approvalDecision={exceptionCase.approvalDecision}
        approverName={exceptionCase.approverUser?.name ?? null}
        approvalNote={exceptionCase.approvalNote}
        approvalAt={exceptionCase.approvalAt}
      />

      <EvidencePanel exceptionId={exceptionCase.id} version={exceptionCase.version} evidenceRecords={exceptionCase.evidenceRecords} />
      <NotesPanel exceptionId={exceptionCase.id} version={exceptionCase.version} notes={exceptionCase.comments} />
      <AuditTimeline events={auditEvents} />
    </div>
  );
}
