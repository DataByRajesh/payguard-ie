"use client";

import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { executeUatCaseAction } from "@/lib/actions/uat";
import { UAT_STATUSES } from "@/lib/exception-workflow/types";

interface LinkableException {
  id: string;
  caseReference: string;
  title: string;
}

export function UatExecutionForm({ testCaseId, linkableExceptions }: { testCaseId: string; linkableExceptions: LinkableException[] }) {
  const [state, formAction, isPending] = useWorkflowActionState(executeUatCaseAction);

  return (
    <Card title="Record a new execution">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          formAction(new FormData(event.currentTarget));
        }}
        className="flex flex-col gap-3"
      >
        <input type="hidden" name="testCaseId" value={testCaseId} />
        <div className="flex flex-wrap gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-xs font-medium text-slate-600">
              Result
            </label>
            <select id="status" name="status" required className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
              {UAT_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label htmlFor="linkedExceptionCaseId" className="text-xs font-medium text-slate-600">
              Link to an existing exception (optional — manual only, never auto-created)
            </label>
            <select
              id="linkedExceptionCaseId"
              name="linkedExceptionCaseId"
              defaultValue=""
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
            >
              <option value="">Not linked</option>
              {linkableExceptions.map((exceptionCase) => (
                <option key={exceptionCase.id} value={exceptionCase.id}>
                  {exceptionCase.caseReference} — {exceptionCase.title}
                </option>
              ))}
            </select>
          </div>
        </div>
        <textarea
          name="actualResult"
          rows={2}
          placeholder="Actual result observed (optional)"
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        />
        <textarea
          name="notes"
          rows={2}
          placeholder="Notes — e.g. why this is blocked (optional)"
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        />
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isPending}
            className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Record execution
          </button>
          <FormMessage state={state} isPending={isPending} />
        </div>
      </form>
    </Card>
  );
}
