import { PageHeader } from "@/components/ui/PageHeader";
import { UatTable } from "@/components/uat/UatTable";
import { getUatTestCasesWithLatestExecution, getUatSummary } from "@/lib/queries/uat";

export const dynamic = "force-dynamic";

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

export default async function UatPage() {
  const [testCases, summary] = await Promise.all([getUatTestCasesWithLatestExecution(), getUatSummary()]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="UAT"
        description="User acceptance test management for payments-ops workflows. Executions are recorded manually and may optionally be linked to an existing exception case — a failed execution never automatically creates one."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile label="Test cases" value={testCases.length} />
        <SummaryTile label="Pass" value={summary.pass} />
        <SummaryTile label="Fail" value={summary.fail} />
        <SummaryTile label="Blocked" value={summary.blocked} />
        <SummaryTile label="Not run" value={summary.notRun} />
      </div>

      <UatTable testCases={testCases} />
    </div>
  );
}
