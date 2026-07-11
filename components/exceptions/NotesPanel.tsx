"use client";

import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { FormMessage, WorkflowHiddenFields } from "@/components/ui/FormMessage";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { addNoteAction } from "@/lib/actions/exceptions";
import { formatDateTime } from "@/lib/format";
import { EXCEPTION_NOTE_TYPE_LABELS } from "@/lib/status";
import { EXCEPTION_NOTE_TYPES } from "@/lib/exception-workflow/types";
import type { ExceptionComment, User } from "@/app/generated/prisma/client";

interface NoteItem extends ExceptionComment {
  authorUser: User;
}

export function NotesPanel({ exceptionId, version, notes }: { exceptionId: string; version: number; notes: NoteItem[] }) {
  const [state, formAction, isPending] = useWorkflowActionState(addNoteAction);

  return (
    <Card title="Investigation notes">
      <div className="flex flex-col gap-4">
        {notes.length === 0 ? (
          <EmptyState title="No notes yet" description="Investigation notes will appear here as they are added." />
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((note) => (
              <li key={note.id} className="rounded-md border border-slate-200 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {EXCEPTION_NOTE_TYPE_LABELS[note.noteType] ?? note.noteType}
                  </span>
                  <span className="text-xs text-slate-400">
                    {note.authorUser.name} · {formatDateTime(note.createdAt)}
                  </span>
                </div>
                <p className="mt-2 text-slate-700">{note.body}</p>
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
              <label htmlFor="noteType" className="text-xs font-medium text-slate-600">
                Type
              </label>
              <select id="noteType" name="noteType" className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
                {EXCEPTION_NOTE_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {EXCEPTION_NOTE_TYPE_LABELS[type]}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <textarea
            name="content"
            required
            rows={3}
            placeholder="Add an investigation note…"
            className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isPending}
              className="w-fit rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add note
            </button>
            <FormMessage state={state} isPending={isPending} />
          </div>
        </form>
      </div>
    </Card>
  );
}
