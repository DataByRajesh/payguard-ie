"use client";

export default function ReconciliationRunError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-rose-200 bg-rose-50 p-6">
      <h2 className="text-sm font-semibold text-rose-800">Unable to load this reconciliation run</h2>
      <p className="text-sm text-rose-700">
        An error occurred while retrieving this run. {error.digest ? `Reference: ${error.digest}` : null}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-rose-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-800"
      >
        Try again
      </button>
    </div>
  );
}
