import type { ActionResult } from "@/lib/actions/helpers";

export function FormMessage({ state, isPending }: { state: ActionResult; isPending: boolean }) {
  if (isPending) return <p className="text-xs text-slate-400">Working…</p>;
  if (!state.message) return null;
  return (
    <p role="status" className={`text-xs ${state.success ? "text-emerald-700" : "text-rose-700"}`}>
      {state.message}
    </p>
  );
}

export function WorkflowHiddenFields({ exceptionId, version }: { exceptionId: string; version: number }) {
  return (
    <>
      <input type="hidden" name="exceptionId" value={exceptionId} />
      <input type="hidden" name="expectedVersion" value={version} />
    </>
  );
}
