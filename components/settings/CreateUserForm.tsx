"use client";

import { useRef } from "react";
import { createUserAction } from "@/lib/actions/users";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { FormMessage } from "@/components/ui/FormMessage";

export function CreateUserForm({ roles }: { roles: readonly string[] }) {
  const [state, formAction, isPending] = useWorkflowActionState(createUserAction);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        formAction(new FormData(formRef.current!));
        formRef.current?.reset();
      }}
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="new-user-name" className="text-xs font-medium text-slate-600">
          Name
        </label>
        <input id="new-user-name" name="name" required className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-user-email" className="text-xs font-medium text-slate-600">
          Email
        </label>
        <input id="new-user-email" name="email" type="email" required className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm" />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="new-user-role" className="text-xs font-medium text-slate-600">
          Role
        </label>
        <select id="new-user-role" name="role" required className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm">
          {roles.map((role) => (
            <option key={role} value={role}>
              {role.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        Add user
      </button>
      <FormMessage state={state} isPending={isPending} />
    </form>
  );
}
