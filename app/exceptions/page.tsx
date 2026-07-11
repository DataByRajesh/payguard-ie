import { PageHeader } from "@/components/ui/PageHeader";
import { ExceptionsFilterBar } from "@/components/filters/ExceptionsFilterBar";
import { ExceptionsTable } from "@/components/exceptions/ExceptionsTable";
import { getExceptionCases, getExceptionQueueSummary } from "@/lib/queries/exceptions";
import { parseExceptionsQuery } from "@/lib/validation/exceptions";
import { getAssignableUsers } from "@/lib/acting-user";

export const dynamic = "force-dynamic";

interface ExceptionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function SummaryTile({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-xl font-semibold text-slate-900 tabular-nums">{value}</p>
    </div>
  );
}

export default async function ExceptionsPage({ searchParams }: ExceptionsPageProps) {
  const query = parseExceptionsQuery(await searchParams);
  const [exceptions, summary, users] = await Promise.all([
    getExceptionCases(query),
    getExceptionQueueSummary(),
    getAssignableUsers(),
  ]);
  const hasActiveFilters = Boolean(
    query.type || query.severity || query.status || query.ownerId || query.unassigned || query.slaState || query.rootCause || query.q,
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exceptions"
        description="Investigation queue for reconciliation and processing exceptions."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <SummaryTile label="Open" value={summary.open} />
        <SummaryTile label="Unassigned" value={summary.unassigned} />
        <SummaryTile label="Overdue" value={summary.overdue} />
        <SummaryTile label="Due soon" value={summary.dueSoon} />
        <SummaryTile label="Awaiting approval" value={summary.resolvedAwaitingApproval} />
        <SummaryTile label="Closed" value={summary.closed} />
      </div>

      <ExceptionsFilterBar defaultValues={query} users={users} />
      <ExceptionsTable exceptions={exceptions} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
