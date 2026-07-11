"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage, WorkflowHiddenFields } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { submitResolutionAction } from "@/lib/actions/exceptions";
import { formatDateTime } from "@/lib/format";
import { RESOLUTION_ACTION_LABELS } from "@/lib/status";
import { RESOLUTION_ACTIONS } from "@/lib/exception-workflow/types";

interface ResolutionCardProps {
  exceptionId: string;
  version: number;
  status: string;
  hasRootCause: boolean;
  hasOwner: boolean;
  resolutionAction: string | null;
  resolutionSummary: string | null;
  resolutionUserName: string | null;
  resolutionAt: Date | null;
}

export function ResolutionCard({
  exceptionId,
  version,
  status,
  hasRootCause,
  hasOwner,
  resolutionAction,
  resolutionSummary,
  resolutionUserName,
  resolutionAt,
}: ResolutionCardProps) {
  const [state, formAction, isPending] = useWorkflowActionState(submitResolutionAction);
  const canResolve = status === "INVESTIGATING";

  return (
    <Card title="Resolution">
      <div className="flex flex-col gap-4">
        {resolutionAction ? (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Action</dt>
              <dd className="text-sm text-slate-800">{RESOLUTION_ACTION_LABELS[resolutionAction] ?? resolutionAction}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Resolved</dt>
              <dd className="text-sm text-slate-800">
                {resolutionUserName ?? "—"} · {formatDateTime(resolutionAt)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Summary</dt>
              <dd className="text-sm text-slate-700">{resolutionSummary}</dd>
            </div>
          </dl>
        ) : (
          <EmptyState title="No resolution submitted yet" description="A resolution requires a recorded root cause and an assigned owner first." />
        )}

        {canResolve ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              formAction(new FormData(event.currentTarget));
            }}
            className="flex flex-col gap-2 border-t border-slate-100 pt-3"
          >
            <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
            {!hasRootCause || !hasOwner ? (
              <p className="text-xs text-amber-700">
                {!hasOwner ? "Assign an owner " : ""}
                {!hasOwner && !hasRootCause ? "and " : ""}
                {!hasRootCause ? "record a root cause " : ""}
                before submitting a resolution.
              </p>
            ) : null}
            <div className="flex flex-col gap-1">
              <label htmlFor="resolutionAction" className="text-xs font-medium text-slate-600">
                Resolution action
              </label>
              <select id="resolutionAction" name="resolutionAction" required defaultValue="" className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                <option value="" disabled>
                  Select an action…
                </option>
                {RESOLUTION_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {RESOLUTION_ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="resolutionSummary"
              required
              minLength={10}
              rows={3}
              placeholder="Describe what was done to resolve this exception…"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending || !hasRootCause || !hasOwner}
                className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Submit resolution
              </button>
              <FormMessage state={state} isPending={isPending} />
            </div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
