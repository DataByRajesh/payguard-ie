"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { runReconciliationAction } from "@/lib/actions/reconciliation";

export function RunReconciliationButton() {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await runReconciliationAction();
      setMessage({ type: result.success ? "success" : "error", text: result.message });
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="w-fit rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Running reconciliation…" : "Run reconciliation"}
      </button>
      {message ? (
        <p role="status" className={`text-sm ${message.type === "success" ? "text-emerald-700" : "text-rose-700"}`}>
          {message.text}
        </p>
      ) : null}
    </div>
  );
}
