"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage, WorkflowHiddenFields } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { addExceptionEvidenceAction } from "@/lib/actions/exceptions";
import { formatDateTime } from "@/lib/format";
import { EVIDENCE_TYPES } from "@/lib/exception-workflow/types";
import type { EvidenceRecord, User } from "@/app/generated/prisma/client";

interface EvidenceItem extends EvidenceRecord {
  addedByUser: User | null;
}

export function EvidencePanel({ exceptionId, version, evidenceRecords }: { exceptionId: string; version: number; evidenceRecords: EvidenceItem[] }) {
  const [state, formAction, isPending] = useWorkflowActionState(addExceptionEvidenceAction);

  return (
    <Card title="Evidence">
      <div className="flex flex-col gap-4">
        {evidenceRecords.length === 0 ? (
          <EmptyState title="No evidence attached" description="Closure requires at least one evidence record." />
        ) : (
          <ul className="flex flex-col gap-2">
            {evidenceRecords.map((evidence) => (
              <li key={evidence.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {evidence.evidenceRef} — {evidence.title}
                  </span>
                  <span className="text-xs text-slate-400">
                    {evidence.addedByUser?.name ?? "—"} · {formatDateTime(evidence.createdAt)}
                  </span>
                </div>
                {evidence.description ? <p className="mt-1 text-slate-600">{evidence.description}</p> : null}
                {evidence.fileReference ? <p className="mt-1 text-xs text-slate-400">{evidence.fileReference}</p> : null}
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            formAction(new FormData(event.currentTarget));
          }}
          className="flex flex-col gap-2 border-t border-slate-100 pt-3"
        >
          <WorkflowHiddenFields exceptionId={exceptionId} version={version} />
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="evidenceType" className="text-xs font-medium text-slate-600">
                Type
              </label>
              <select id="evidenceType" name="evidenceType" className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                {EVIDENCE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="title" className="text-xs font-medium text-slate-600">
                Title
              </label>
              <input id="title" name="title" type="text" required className="w-56 rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
            </div>
          </div>
          <input
            name="fileReference"
            type="text"
            placeholder="Reference / URL / internal path (optional)"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Description (optional)"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add evidence
            </button>
            <FormMessage state={state} isPending={isPending} />
          </div>
        </form>
      </div>
    </Card>
  );
}
