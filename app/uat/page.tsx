import { PlaceholderPage } from "@/components/placeholders/PlaceholderPage";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { UatStatusBadge } from "@/components/badges";
import { getUatTestCasesWithLatestExecution } from "@/lib/queries/uat";

export const dynamic = "force-dynamic";

export default async function UatPage() {
  const testCases = await getUatTestCasesWithLatestExecution();

  return (
    <PlaceholderPage
      title="UAT"
      description="User acceptance test management for payments-ops workflows. This sprint shows a read-only list of test cases and their latest execution; running new executions and attaching evidence directly is planned next."
      upcoming={[
        "Recording new test executions with evidence attachment",
        "Test cycle and release sign-off tracking",
        "Coverage reporting against payments/reconciliation features",
      ]}
      preview={
        <Card title="Test cases (read-only preview)">
          {testCases.length === 0 ? (
            <EmptyState title="No UAT test cases yet" description="Seed the database to see preview data." />
          ) : (
            <ul className="flex flex-col gap-3">
              {testCases.map((testCase) => (
                <li key={testCase.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {testCase.testCaseRef} — {testCase.title}
                    </p>
                    <p className="text-xs text-slate-400">{testCase.area}</p>
                  </div>
                  {testCase.executions[0] ? <UatStatusBadge status={testCase.executions[0].status} /> : null}
                </li>
              ))}
            </ul>
          )}
        </Card>
      }
    />
  );
}
