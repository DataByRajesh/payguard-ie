import Link from "next/link";
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
  assignedUser: { name: string } | null;
  openedAt: Date;
  comments: { id: string; authorUser: { name: string }; body: string; createdAt: Date }[];
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
                <Link
                  href={`/exceptions/${exceptionCase.id}`}
                  prefetch={false}
                  className="text-sm font-medium text-slate-800 underline-offset-2 hover:underline"
                >
                  {exceptionCase.caseReference} — {exceptionCase.title}
                </Link>
                <div className="flex items-center gap-2">
                  <ExceptionSeverityBadge severity={exceptionCase.severity} />
                  <ExceptionStatusBadge status={exceptionCase.status} />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{exceptionCase.description}</p>
              <p className="mt-1 text-xs text-slate-400">
                Opened {formatDateTime(exceptionCase.openedAt)}
                {exceptionCase.assignedUser ? ` · Assigned to ${exceptionCase.assignedUser.name}` : ""}
              </p>
              {exceptionCase.comments.length > 0 ? (
                <ul className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-2">
                  {exceptionCase.comments.map((comment) => (
                    <li key={comment.id} className="text-sm text-slate-600">
                      <span className="font-medium text-slate-700">{comment.authorUser.name}:</span> {comment.body}
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
