"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/lib/actions/helpers";

const INITIAL_STATE: ActionResult = { success: false, message: "" };

/**
 * Wraps a workflow Server Action for manual invocation (not native `<form action>` binding) and
 * exposes pending/result state. Native form-action submission via `useActionState` was found to
 * hang intermittently against a production (`next build && next start`) server on this stack —
 * `useTransition` + a directly-invoked action call is the same reliable pattern already used by
 * RunReconciliationButton in Sprint 2, so every Sprint 3 workflow form uses it too.
 */
export function useWorkflowActionState(action: (formData: FormData) => Promise<ActionResult>) {
  const [state, setState] = useState<ActionResult>(INITIAL_STATE);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    startTransition(async () => {
      const result = await action(formData);
      setState(result);
    });
  }

  return [state, submit, isPending] as const;
}
