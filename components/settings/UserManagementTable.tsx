"use client";

import { useRef } from "react";
import { updateUserRoleAction, setUserActiveAction, resetUserPasswordAction } from "@/lib/actions/users";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { FormMessage } from "@/components/ui/FormMessage";
import type { User } from "@/app/generated/prisma/client";

function UserRow({ user, roles }: { user: User; roles: readonly string[] }) {
  const [roleState, roleAction, rolePending] = useWorkflowActionState(updateUserRoleAction);
  const [activeState, activeAction, activePending] = useWorkflowActionState(setUserActiveAction);
  const [resetState, resetAction, resetPending] = useWorkflowActionState(resetUserPasswordAction);
  const roleFormRef = useRef<HTMLFormElement>(null);

  return (
    <tr>
      <td className="px-3 py-2 text-sm text-slate-800">{user.name}</td>
      <td className="px-3 py-2 text-sm text-slate-600">{user.email}</td>
      <td className="px-3 py-2">
        <form
          ref={roleFormRef}
          onSubmit={(event) => event.preventDefault()}
          className="flex items-center gap-2"
        >
          <input type="hidden" name="userId" value={user.id} />
          <select
            name="role"
            defaultValue={user.role}
            disabled={rolePending}
            onChange={() => roleAction(new FormData(roleFormRef.current!))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          >
            {roles.map((role) => (
              <option key={role} value={role}>
                {role.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </form>
        <FormMessage state={roleState} isPending={rolePending} />
      </td>
      <td className="px-3 py-2 text-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            activeAction(new FormData(event.currentTarget));
          }}
        >
          <input type="hidden" name="userId" value={user.id} />
          <input type="hidden" name="isActive" value={(!user.isActive).toString()} />
          <button
            type="submit"
            disabled={activePending}
            className={`rounded-md border px-2 py-1 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
              user.isActive ? "border-rose-300 text-rose-700 hover:bg-rose-50" : "border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            }`}
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </button>
        </form>
        <FormMessage state={activeState} isPending={activePending} />
      </td>
      <td className="px-3 py-2 text-sm">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            resetAction(new FormData(event.currentTarget));
          }}
        >
          <input type="hidden" name="userId" value={user.id} />
          <button
            type="submit"
            disabled={resetPending}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Reset password
          </button>
        </form>
        <FormMessage state={resetState} isPending={resetPending} />
      </td>
    </tr>
  );
}

export function UserManagementTable({ users, roles }: { users: User[]; roles: readonly string[] }) {
  return (
    <table className="w-full border-collapse">
      <caption className="sr-only">Users</caption>
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs font-medium uppercase tracking-wide text-slate-400">
          <th className="px-3 py-2">Name</th>
          <th className="px-3 py-2">Email</th>
          <th className="px-3 py-2">Role</th>
          <th className="px-3 py-2">Status</th>
          <th className="px-3 py-2">Password</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {users.map((user) => (
          <UserRow key={user.id} user={user} roles={roles} />
        ))}
      </tbody>
    </table>
  );
}
