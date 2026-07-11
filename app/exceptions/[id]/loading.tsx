export default function ExceptionDetailLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite">
      <div className="h-10 w-1/3 animate-pulse rounded-md bg-slate-200" />
      <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
      </div>
    </div>
  );
}
