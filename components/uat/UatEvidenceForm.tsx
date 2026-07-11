"use client";

import { FormMessage } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { addUatEvidenceAction } from "@/lib/actions/uat";
import { EVIDENCE_TYPES } from "@/lib/exception-workflow/types";

export function UatEvidenceForm({ executionId }: { executionId: string }) {
  const [state, formAction, isPending] = useWorkflowActionState(addUatEvidenceAction);

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        formAction(new FormData(event.currentTarget));
      }}
      className="mt-3 flex flex-col gap-2 border-t border-slate-100 pt-3"
    >
      <input type="hidden" name="executionId" value={executionId} />
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor={`evidenceType-${executionId}`} className="text-xs font-medium text-slate-600">
            Type
          </label>
          <select id={`evidenceType-${executionId}`} name="evidenceType" className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
            {EVIDENCE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replaceAll("_", " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor={`title-${executionId}`} className="text-xs font-medium text-slate-600">
            Title
          </label>
          <input
            id={`title-${executionId}`}
            name="title"
            type="text"
            required
            className="w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
        </div>
      </div>
      <input
        name="fileReference"
        type="text"
        placeholder="Reference / URL / internal path (optional)"
        className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="w-fit rounded-md border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Add evidence
        </button>
        <FormMessage state={state} isPending={isPending} />
      </div>
    </form>
  );
}
