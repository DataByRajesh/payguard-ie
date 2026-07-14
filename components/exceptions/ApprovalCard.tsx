"use client";

import { useRef } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage, WorkflowHiddenFields } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { approveExceptionAction, rejectExceptionAction } from "@/lib/actions/exceptions";
import { formatDateTime } from "@/lib/format";

interface ApprovalCardProps {
  exceptionId: string;
  version: number;
  status: string;
  evidenceCount: number;
  resolutionUserId: string | null;
  actingUserId: string;
  approvalDecision: string | null;
  approverName: string | null;
  approvalNote: string | null;
  approvalAt: Date | null;
}

export function ApprovalCard({
  exceptionId,
  version,
  status,
  evidenceCount,
  resolutionUserId,
  actingUserId,
  approvalDecision,
  approverName,
  approvalNote,
  approvalAt,
}: ApprovalCardProps) {
  const [approveState, approveAction, approvePending] = useWorkflowActionState(approveExceptionAction);
  const [rejectState, rejectAction, rejectPending] = useWorkflowActionState(rejectExceptionAction);
  const formRef = useRef<HTMLFormElement>(null);

  const isSelfReview = resolutionUserId !== null && resolutionUserId === actingUserId;
  const canReview = status === "RESOLVED";

  return (
    <Card title="Approval">
      <div className="flex flex-col gap-4">
        {approvalDecision ? (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Last decision</dt>
              <dd className="text-sm text-slate-800">{approvalDecision === "APPROVED" ? "Approved" : "Rejected"}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">By</dt>
              <dd className="text-sm text-slate-800">
                {approverName ?? "—"} · {formatDateTime(approvalAt)}
              </dd>
            </div>
            {approvalNote ? (
              <div className="col-span-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Note</dt>
                <dd className="text-sm text-slate-700">{approvalNote}</dd>
              </div>
            ) : null}
          </dl>
        ) : (
          <EmptyState title="Not yet reviewed" description="A resolved case requires independent review before it can be closed." />
        )}

        {canReview ? (
          isSelfReview ? (
            <p className="text-xs text-amber-700">
              This case was resolved by the currently signed-in user. Log in as a different demo user to approve or reject it.
            </p>
          ) : (
            <form ref={formRef} onSubmit={(event) => event.preventDefault()} className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
              {evidenceCount < 1 ? <p className="text-xs text-amber-700">Closure requires at least one evidence record.</p> : null}
              <textarea
                name="approvalNote"
                rows={2}
                placeholder="Approval / rejection note (optional)"
                className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => approveAction(new FormData(formRef.current!))}
                  disabled={approvePending || evidenceCount < 1}
                  className="rounded-md bg-emerald-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Approve &amp; close
                </button>
                <button
                  type="button"
                  onClick={() => rejectAction(new FormData(formRef.current!))}
                  disabled={rejectPending}
                  className="rounded-md border border-rose-300 px-3 py-1.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
              <FormMessage state={approveState} isPending={approvePending} />
              <FormMessage state={rejectState} isPending={rejectPending} />
            </form>
          )
        ) : null}
      </div>
    </Card>
  );
}
