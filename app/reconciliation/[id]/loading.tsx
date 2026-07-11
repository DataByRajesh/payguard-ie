export default function ReconciliationRunLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="h-10 w-1/3 animate-pulse rounded-md bg-slate-200" />
      <div className="h-48 animate-pulse rounded-lg bg-slate-100" />
      <div className="h-64 animate-pulse rounded-lg bg-slate-100" />
    </div>
  );
}
