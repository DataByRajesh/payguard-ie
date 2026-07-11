import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { PaymentStatusChart } from "@/components/dashboard/PaymentStatusChart";
import { getDashboardSummary } from "@/lib/queries/dashboard";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

function StatTile({ label, value, href }: { label: string; value: number; href?: string }) {
  const content = (
    <div className="rounded-lg border border-slate-200 bg-white p-4 transition-colors hover:border-slate-300">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function DashboardPage() {
  const summary = await getDashboardSummary();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Dashboard"
        description="A live snapshot of payment, reconciliation, exception and UAT activity."
      />

      <div>
        <h2 className="mb-2 text-sm font-semibold text-slate-900">Exceptions</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatTile label="Open" value={summary.exceptions.open} href="/exceptions" />
          <StatTile label="Unassigned" value={summary.exceptions.unassigned} href="/exceptions?unassigned=true" />
          <StatTile label="Overdue" value={summary.exceptions.overdue} href="/exceptions?slaState=OVERDUE" />
          <StatTile label="Due soon" value={summary.exceptions.dueSoon} href="/exceptions?slaState=DUE_SOON" />
          <StatTile label="Awaiting approval" value={summary.exceptions.resolvedAwaitingApproval} href="/exceptions?status=RESOLVED" />
          <StatTile label="Closed" value={summary.exceptions.closed} href="/exceptions?status=CLOSED" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatTile label="Total payments" value={summary.totalPayments} href="/payments" />
        <StatTile label="Total settlements" value={summary.totalSettlements} href="/settlements" />
        <StatTile label="UAT fail count" value={summary.uat.fail} href="/uat" />
      </div>

      <Card title="Payments by status">
        <PaymentStatusChart data={summary.statusCounts.map((s) => ({ label: s.label, count: s.count }))} />
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Latest reconciliation run">
          {summary.latestReconciliationRun ? (
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Reference</dt>
                <dd className="text-sm text-slate-800">
                  <Link href={`/reconciliation/${summary.latestReconciliationRun.id}`} className="underline-offset-2 hover:underline">
                    {summary.latestReconciliationRun.runReference}
                  </Link>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Started</dt>
                <dd className="text-sm text-slate-800">{formatDateTime(summary.latestReconciliationRun.startedAt)}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Status</dt>
                <dd className="text-sm text-slate-800">{summary.latestReconciliationRun.status}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Exceptions created</dt>
                <dd className="text-sm text-slate-800">{summary.latestReconciliationRun.exceptionsCreated}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-slate-500">No reconciliation runs yet.</p>
          )}
        </Card>

        <Card title="UAT execution counts">
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Pass</dt>
              <dd className="text-sm text-slate-800 tabular-nums">{summary.uat.pass}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Fail</dt>
              <dd className="text-sm text-slate-800 tabular-nums">{summary.uat.fail}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Blocked</dt>
              <dd className="text-sm text-slate-800 tabular-nums">{summary.uat.blocked}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Not run</dt>
              <dd className="text-sm text-slate-800 tabular-nums">{summary.uat.notRun}</dd>
            </div>
          </dl>
        </Card>
      </div>
    </div>
  );
}
