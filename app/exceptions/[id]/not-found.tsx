import Link from "next/link";

export default function ExceptionNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-800">Exception case not found</h2>
      <p className="text-sm text-slate-600">No exception case exists with this reference.</p>
      <Link href="/exceptions" className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline">
        Back to exceptions
      </Link>
    </div>
  );
}
