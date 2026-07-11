import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { RunSummaryCard } from "@/components/reconciliation/RunSummaryCard";
import { ResultsTable } from "@/components/reconciliation/ResultsTable";
import { getReconciliationRunById } from "@/lib/queries/reconciliation";
import { idParamSchema } from "@/lib/validation/common";

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function ReconciliationRunDetailPage({ params }: RunDetailPageProps) {
  const { id } = await params;
  const parsedId = idParamSchema.safeParse(id);
  if (!parsedId.success) {
    notFound();
  }

  const run = await getReconciliationRunById(parsedId.data);
  if (!run) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={run.runReference}
        description={
          <>
            <Link href="/reconciliation" className="text-slate-500 underline-offset-2 hover:underline">
              Reconciliation
            </Link>{" "}
            / {run.runReference}
          </>
        }
      />
      <RunSummaryCard run={run} />
      <ResultsTable results={run.results} />
    </div>
  );
}
