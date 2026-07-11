import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PaymentStatusChart } from "@/components/dashboard/PaymentStatusChart";
import { getDashboardSummary } from "@/lib/queries/dashboard";

export const dynamic = "force-dynamic";

function StatTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="A snapshot of current payment activity. The full KPI dashboard — SLA trending, settlement throughput, control-evidence coverage — is planned for a future sprint."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total payments" value={summary.totalPayments} />
        <StatTile label="Total settlements" value={summary.totalSettlements} />
        <StatTile label="Open exceptions" value={summary.openExceptions} />
      </div>

      <Card title="Payments by status">
        <PaymentStatusChart data={summary.statusCounts.map((s) => ({ label: s.label, count: s.count }))} />
      </Card>

      <Card title="Planned for a future sprint">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>SLA breach trending over time</li>
          <li>Settlement throughput and provider-level delay tracking</li>
          <li>Control-evidence coverage summary for audit reporting</li>
          <li>Exception ageing and case-load by analyst</li>
        </ul>
      </Card>
    </div>
  );
}
