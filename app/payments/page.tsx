import { PageHeader } from "@/components/ui/PageHeader";
import { PaymentsFilterBar } from "@/components/filters/PaymentsFilterBar";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { getPayments } from "@/lib/queries/payments";
import { parsePaymentsQuery } from "@/lib/validation/payments";

interface PaymentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentsPage({ searchParams }: PaymentsPageProps) {
  const query = parsePaymentsQuery(await searchParams);
  const payments = await getPayments(query);
  const hasActiveFilters = Boolean(query.status || query.settlementStatus || query.currency || query.q);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Payments"
        description="Operational view of all payments and their live-derived settlement status."
      />
      <PaymentsFilterBar defaultValues={query} />
      <PaymentsTable payments={payments} hasActiveFilters={hasActiveFilters} />
    </div>
  );
}
