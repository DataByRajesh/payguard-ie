"use client";

import { Card } from "@/components/ui/Card";
import { FormMessage, WorkflowHiddenFields } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { assignExceptionAction, requestInformationAction, resumeInvestigationAction, startInvestigationAction } from "@/lib/actions/exceptions";
import type { User } from "@/app/generated/prisma/client";

interface OwnerAndActionsCardProps {
  exceptionId: string;
  version: number;
  status: string;
  assignedUser: User | null;
  users: User[];
}

export function OwnerAndActionsCard({ exceptionId, version, status, assignedUser, users }: OwnerAndActionsCardProps) {
  const [assignState, assignAction, assignPending] = useWorkflowActionState(assignExceptionAction);
  const [investigateState, investigateAction, investigatePending] = useWorkflowActionState(startInvestigationAction);
  const [requestInfoState, requestInfoAction, requestInfoPending] = useWorkflowActionState(requestInformationAction);
  const [resumeState, resumeAction, resumePending] = useWorkflowActionState(resumeInvestigationAction);

  const canAssign = status !== "RESOLVED" && status !== "CLOSED";

  return (
    <Card title="Owner & actions">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Current owner</p>
          <p className="text-sm text-slate-800">{assignedUser ? assignedUser.name : "Unassigned"}</p>
        </div>

        {canAssign ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              assignAction(new FormData(event.currentTarget));
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
            <div className="flex flex-col gap-1">
              <label htmlFor="assignToUserId" className="text-xs font-medium text-slate-600">
                {assignedUser ? "Reassign to" : "Assign to"}
              </label>
              <select id="assignToUserId" name="assignToUserId" required className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                <option value="">Select a user…</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="note" className="text-xs font-medium text-slate-600">
                Note (optional)
              </label>
              <input id="note" name="note" type="text" className="w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
            </div>
            <button
              type="submit"
              disabled={assignPending}
              className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {assignedUser ? "Reassign" : "Assign"}
            </button>
          </form>
        ) : null}
        <FormMessage state={assignState} isPending={assignPending} />

        <div className="flex flex-wrap gap-2">
          {status === "ASSIGNED" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                investigateAction(new FormData(event.currentTarget));
              }}
            >
              <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
              <button
                type="submit"
                disabled={investigatePending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Start investigation
              </button>
            </form>
          ) : null}
          {status === "INVESTIGATING" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                requestInfoAction(new FormData(event.currentTarget));
              }}
            >
              <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
              <button
                type="submit"
                disabled={requestInfoPending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Mark awaiting information
              </button>
            </form>
          ) : null}
          {status === "AWAITING_INFORMATION" ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                resumeAction(new FormData(event.currentTarget));
              }}
            >
              <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
              <button
                type="submit"
                disabled={resumePending}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Resume investigation
              </button>
            </form>
          ) : null}
        </div>
        <FormMessage state={investigateState} isPending={investigatePending} />
        <FormMessage state={requestInfoState} isPending={requestInfoPending} />
        <FormMessage state={resumeState} isPending={resumePending} />
      </div>
    </Card>
  );
}
