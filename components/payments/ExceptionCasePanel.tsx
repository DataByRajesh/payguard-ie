import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExceptionSeverityBadge, ExceptionStatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { ExceptionSeverity, ExceptionStatus } from "@/app/generated/prisma/client";

interface ExceptionCaseItem {
  id: string;
  caseReference: string;
  type: string;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  title: string;
  description: string;
  assignedTo: string | null;
  openedAt: Date;
  comments: { id: string; author: string; body: string; createdAt: Date }[];
}

export function ExceptionCasePanel({ exceptionCases }: { exceptionCases: ExceptionCaseItem[] }) {
  return (
    <Card title="Exception cases">
      {exceptionCases.length === 0 ? (
        <EmptyState
          title="No exception cases"
          description="No reconciliation or processing exceptions have been raised for this payment."
        />
      ) : (
        <ul className="flex flex-col gap-4">
          {exceptionCases.map((exceptionCase) => (
            <li key={exceptionCase.id} className="rounded-md border border-slate-200 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-800">
                  {exceptionCase.caseReference} — {exceptionCase.title}
                </span>
                <div className="flex items-center gap-2">
                  <ExceptionSeverityBadge severity={exceptionCase.severity} />
                  <ExceptionStatusBadge status={exceptionCase.status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{exceptionCase.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                Opened {formatDateTime(exceptionCase.openedAt)}
                {exceptionCase.assignedTo ? ` · Assigned to ${exceptionCase.assignedTo}` : ""}
              </p>
              {exceptionCase.comments.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-2">
                  {exceptionCase.comments.map((comment) => (
                    <li key={comment.id} className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">{comment.author}:</span> {comment.body}
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
