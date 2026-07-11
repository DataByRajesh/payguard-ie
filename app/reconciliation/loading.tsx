export default function ReconciliationLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="h-14 animate-pulse rounded-md bg-slate-200" />
      <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-slate-100" />
        ))}
      </div>
    </div>
  );
}
