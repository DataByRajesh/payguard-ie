import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { UatStatusBadge } from "@/components/badges";
import { UatEvidenceForm } from "@/components/uat/UatEvidenceForm";
import { formatDateTime } from "@/lib/format";
import type { EvidenceRecord, ExceptionCase, UATExecution, User } from "@/app/generated/prisma/client";

interface ExecutionItem extends UATExecution {
  testerUser: User | null;
  linkedExceptionCase: ExceptionCase | null;
  evidenceRecords: (EvidenceRecord & { addedByUser: User | null })[];
}

export function UatExecutionHistory({ executions }: { executions: ExecutionItem[] }) {
  return (
    <Card title="Execution history">
      {executions.length === 0 ? (
        <EmptyState title="No executions recorded" description="Record the first execution for this test case above." />
      ) : (
        <ul className="flex flex-col gap-4">
          {executions.map((execution) => (
            <li key={execution.id} className="rounded-md border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <UatStatusBadge status={execution.status} />
                <span className="text-xs text-slate-400">
                  {execution.testerUser?.name ?? "—"} · {execution.executedAt ? formatDateTime(execution.executedAt) : "Not yet executed"}
                </span>
              </div>
              {execution.actualResult ? <p className="mt-2 text-slate-700">{execution.actualResult}</p> : null}
              {execution.notes ? <p className="mt-1 text-xs text-slate-500">{execution.notes}</p> : null}
              {execution.linkedExceptionCase ? (
                <p className="mt-2 text-xs">
                  Linked to{" "}
                  <Link href={`/exceptions/${execution.linkedExceptionCase.id}`} prefetch={false} className="font-medium text-slate-800 underline-offset-2 hover:underline">
                    {execution.linkedExceptionCase.caseReference}
                  </Link>
                </p>
              ) : null}

              {execution.evidenceRecords.length > 0 ? (
                <ul className="mt-2 flex flex-col gap-1 border-t border-slate-100 pt-2">
                  {execution.evidenceRecords.map((evidence) => (
                    <li key={evidence.id} className="text-xs text-slate-600">
                      <span className="font-medium text-slate-700">{evidence.evidenceRef}</span> — {evidence.title}
                      {evidence.fileReference ? ` (${evidence.fileReference})` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}

              <UatEvidenceForm executionId={execution.id} />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
