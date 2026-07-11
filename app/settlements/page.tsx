import { PageHeader } from "@/components/ui/PageHeader";
import { SettlementsFilterBar } from "@/components/filters/SettlementsFilterBar";
import { SettlementsTable } from "@/components/settlements/SettlementsTable";
import { getSettlements } from "@/lib/queries/settlements";
import { parseSettlementsQuery } from "@/lib/validation/settlements";

interface SettlementsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SettlementsPage({ searchParams }: SettlementsPageProps) {
  const query = parseSettlementsQuery(await searchParams);
  const settlements = await getSettlements(query);
  const hasActiveFilters = Boolean(query.status || query.currency || query.q);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settlements"
        description="Settlement files received and their link back to the originating payment."
      />
      <SettlementsFilterBar defaultValues={query} />
      <SettlementsTable settlements={settlements} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
