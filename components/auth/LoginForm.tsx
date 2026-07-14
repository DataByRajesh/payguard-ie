"use client";

import { useRef } from "react";
import { loginAction } from "@/lib/actions/auth";
import { useWorkflowActionState } from "@/lib/hooks/useWorkflowActionState";
import { FormMessage } from "@/components/ui/FormMessage";

export function LoginForm() {
  const [state, formAction, isPending] = useWorkflowActionState(loginAction);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      onSubmit={(event) => {
        event.preventDefault();
        formAction(new FormData(formRef.current!));
      }}
      className="flex flex-col gap-3"
    >
      <div>
        <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide text-slate-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wide text-slate-400">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="mt-1 rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Signing in…" : "Sign in"}
      </button>
      <FormMessage state={state} isPending={false} />
    </form>
  );
}
