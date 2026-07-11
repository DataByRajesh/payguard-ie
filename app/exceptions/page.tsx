import { PageHeader } from "@/components/ui/PageHeader";
import { ExceptionsFilterBar } from "@/components/filters/ExceptionsFilterBar";
import { ExceptionsTable } from "@/components/exceptions/ExceptionsTable";
import { getExceptionCases } from "@/lib/queries/exceptions";
import { parseExceptionsQuery } from "@/lib/validation/exceptions";

export const dynamic = "force-dynamic";

interface ExceptionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ExceptionsPage({ searchParams }: ExceptionsPageProps) {
  const query = parseExceptionsQuery(await searchParams);
  const exceptions = await getExceptionCases(query);
  const hasActiveFilters = Boolean(query.type || query.severity || query.status || query.slaState || query.q);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Exceptions"
        description="Investigation queue for reconciliation and processing exceptions."
      />
      <ExceptionsFilterBar defaultValues={query} />
      <ExceptionsTable exceptions={exceptions} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
