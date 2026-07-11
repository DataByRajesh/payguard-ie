"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage, WorkflowHiddenFields } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { recordRootCauseAction } from "@/lib/actions/exceptions";
import { formatDateTime } from "@/lib/format";
import { ROOT_CAUSE_CATEGORY_LABELS } from "@/lib/status";
import { ROOT_CAUSE_CATEGORIES } from "@/lib/exception-workflow/types";

interface RootCauseCardProps {
  exceptionId: string;
  version: number;
  status: string;
  rootCauseCategory: string | null;
  rootCauseSummary: string | null;
  rootCauseIdentifiedByName: string | null;
  rootCauseIdentifiedAt: Date | null;
}

export function RootCauseCard({
  exceptionId,
  version,
  status,
  rootCauseCategory,
  rootCauseSummary,
  rootCauseIdentifiedByName,
  rootCauseIdentifiedAt,
}: RootCauseCardProps) {
  const [state, formAction, isPending] = useWorkflowActionState(recordRootCauseAction);
  const canEdit = status === "INVESTIGATING" || status === "AWAITING_INFORMATION";

  return (
    <Card title="Root-cause analysis">
      <div className="flex flex-col gap-4">
        {rootCauseCategory ? (
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Category</dt>
              <dd className="text-sm text-slate-800">{ROOT_CAUSE_CATEGORY_LABELS[rootCauseCategory] ?? rootCauseCategory}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Identified</dt>
              <dd className="text-sm text-slate-800">
                {rootCauseIdentifiedByName ?? "—"} · {formatDateTime(rootCauseIdentifiedAt)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Summary</dt>
              <dd className="text-sm text-slate-700">{rootCauseSummary}</dd>
            </div>
          </dl>
        ) : (
          <EmptyState title="No root cause recorded yet" description="A root cause must be recorded before this case can be resolved." />
        )}

        {canEdit ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              formAction(new FormData(event.currentTarget));
            }}
            className="flex flex-col gap-2 border-t border-slate-100 pt-3"
          >
            <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
            <div className="flex flex-col gap-1">
              <label htmlFor="rootCauseCategory" className="text-xs font-medium text-slate-600">
                Category
              </label>
              <select
                id="rootCauseCategory"
                name="rootCauseCategory"
                defaultValue={rootCauseCategory ?? ""}
                required
                className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
              >
                <option value="" disabled>
                  Select a category…
                </option>
                {ROOT_CAUSE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {ROOT_CAUSE_CATEGORY_LABELS[category]}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="rootCauseSummary"
              defaultValue={rootCauseSummary ?? ""}
              required
              minLength={10}
              rows={3}
              placeholder="Describe the root cause in enough detail for someone else to understand it…"
              className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={isPending}
                className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {rootCauseCategory ? "Update root cause" : "Record root cause"}
              </button>
              <FormMessage state={state} isPending={isPending} />
            </div>
          </form>
        ) : null}
      </div>
    </Card>
  );
}
