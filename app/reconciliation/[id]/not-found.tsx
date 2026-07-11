import Link from "next/link";

export default function ReconciliationRunNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-800">Reconciliation run not found</h2>
      <p className="text-sm text-slate-600">No reconciliation run exists with this reference.</p>
      <Link href="/reconciliation" className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline">
        Back to reconciliation
      </Link>
    </div>
  );
}
