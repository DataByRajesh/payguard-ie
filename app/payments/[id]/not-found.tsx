import Link from "next/link";

export default function PaymentNotFound() {
  return (
    <div className="flex flex-col items-start gap-3 rounded-md border border-slate-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-slate-800">Payment not found</h2>
      <p className="text-sm text-slate-600">No payment exists with this reference. It may have been removed.</p>
      <Link href="/payments" className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline">
        Back to payments
      </Link>
    </div>
  );
}
