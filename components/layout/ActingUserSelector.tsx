"use client";

import { useRef } from "react";
import { setActingUserAction } from "@/lib/actions/actingUser";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";

interface ActingUserSelectorProps {
  users: { id: string; name: string; role: string }[];
  actingUserId: string;
}

export function ActingUserSelector({ users, actingUserId }: ActingUserSelectorProps) {
  const [state, formAction, isPending] = useWorkflowActionState(setActingUserAction);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => event.preventDefault()}
      className="flex items-center gap-2 text-xs"
    >
      <label htmlFor="acting-user-select" className="font-medium uppercase tracking-wide text-slate-400">
        Acting as
      </label>
      <select
        id="acting-user-select"
        name="userId"
        defaultValue={actingUserId}
        disabled={isPending}
        onChange={() => formAction(new FormData(formRef.current!))}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-800"
      >
        {users.map((user) => (
          <option key={user.id} value={user.id}>
            {user.name} ({user.role.replace(/_/g, " ")})
          </option>
        ))}
      </select>
      {state.message ? (
        <span className={state.success ? "text-emerald-700" : "text-rose-700"} role="status">
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
