import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { UatStatusBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/format";
import type { UATExecution, UATTestCase } from "@/app/generated/prisma/client";

export interface UatTestCaseListItem extends UATTestCase {
  executions: UATExecution[];
}

export function UatTable({ testCases }: { testCases: UatTestCaseListItem[] }) {
  const columns: DataTableColumn<UatTestCaseListItem>[] = [
    {
      key: "reference",
      header: "Test case",
      render: (testCase) => (
        <Link href={`/uat/${testCase.id}`} className="font-medium text-slate-900 underline-offset-2 hover:underline">
          {testCase.testCaseRef} — {testCase.title}
        </Link>
      ),
    },
    { key: "area", header: "Area", render: (testCase) => testCase.area },
    { key: "requirement", header: "Requirement", render: (testCase) => testCase.requirementReference ?? "—" },
    {
      key: "status",
      header: "Latest result",
      render: (testCase) => (testCase.executions[0] ? <UatStatusBadge status={testCase.executions[0].status} /> : <UatStatusBadge status="NOT_RUN" />),
    },
    {
      key: "executed",
      header: "Last executed",
      render: (testCase) => (testCase.executions[0]?.executedAt ? formatDateTime(testCase.executions[0].executedAt) : "Never"),
    },
  ];

  return (
    <DataTable
      caption="UAT test cases"
      columns={columns}
      rows={testCases}
      rowKey={(testCase) => testCase.id}
      emptyState={<EmptyState title="No UAT test cases yet" description="Seed the database to see test cases." />}
    />
  );
}
