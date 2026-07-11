import { notFound } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { UatExecutionForm } from "@/components/uat/UatExecutionForm";
import { UatExecutionHistory } from "@/components/uat/UatExecutionHistory";
import { getUatTestCaseById, getLinkableExceptionCases } from "@/lib/queries/uat";
import { idParamSchema } from "@/lib/validation/common";

interface UatDetailPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function UatDetailPage({ params }: UatDetailPageProps) {
  const { id } = await params;
  const parsedId = idParamSchema.safeParse(id);
  if (!parsedId.success) {
    notFound();
  }

  const testCase = await getUatTestCaseById(parsedId.data);
  if (!testCase) {
    notFound();
  }

  const linkableExceptions = await getLinkableExceptionCases();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={`${testCase.testCaseRef} — ${testCase.title}`}
        description={
          <>
            <Link href="/uat" className="text-slate-500 underline-offset-2 hover:underline">
              UAT
            </Link>{" "}
            / {testCase.testCaseRef}
          </>
        }
      />

      <Card title="Test case detail">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Area</dt>
            <dd className="text-sm text-slate-800">{testCase.area}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Requirement reference</dt>
            <dd className="text-sm text-slate-800">{testCase.requirementReference ?? "—"}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Description</dt>
            <dd className="text-sm text-slate-800">{testCase.description}</dd>
          </div>
          {testCase.preconditions ? (
            <div className="sm:col-span-2">
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Preconditions</dt>
              <dd className="whitespace-pre-line text-sm text-slate-800">{testCase.preconditions}</dd>
            </div>
          ) : null}
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Steps</dt>
            <dd className="whitespace-pre-line text-sm text-slate-800">{testCase.steps}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">Expected result</dt>
            <dd className="text-sm text-slate-800">{testCase.expectedResult}</dd>
          </div>
        </dl>
      </Card>

      <UatExecutionForm testCaseId={testCase.id} linkableExceptions={linkableExceptions} />
      <UatExecutionHistory executions={testCase.executions} />
    </div>
  );
}
