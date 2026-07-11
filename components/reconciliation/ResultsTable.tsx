import Link from "next/link";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExceptionSeverityBadge, RuleResultBadge, RuleTypeBadge } from "@/components/badges";
import type { ExceptionCase, ExceptionSeverity, Payment, Settlement } from "@/app/generated/prisma/client";
import type { RuleType } from "@/lib/reconciliation-engine/types";

export interface ResultRow {
  id: string;
  ruleType: RuleType;
  passed: boolean;
  severity: ExceptionSeverity | null;
  summary: string;
  payment: Payment;
  settlement: Settlement | null;
  exceptionCase: ExceptionCase | null;
}

export function ResultsTable({ results }: { results: ResultRow[] }) {
  const columns: DataTableColumn<ResultRow>[] = [
    { key: "rule", header: "Rule", render: (result) => <RuleTypeBadge rule={result.ruleType} /> },
    { key: "result", header: "Result", render: (result) => <RuleResultBadge passed={result.passed} /> },
    {
      key: "severity",
      header: "Severity",
      render: (result) => (result.severity ? <ExceptionSeverityBadge severity={result.severity} /> : "—"),
    },
    { key: "summary", header: "Summary", render: (result) => result.summary },
    {
      key: "payment",
      header: "Payment",
      render: (result) => (
        <Link href={`/payments/${result.payment.id}`} className="text-slate-700 underline-offset-2 hover:underline">
          {result.payment.paymentReference}
        </Link>
      ),
    },
    {
      key: "settlement",
      header: "Settlement",
      render: (result) => result.settlement?.settlementReference ?? "—",
    },
    {
      key: "exception",
      header: "Exception",
      render: (result) =>
        result.exceptionCase ? (
          <Link href={`/exceptions/${result.exceptionCase.id}`} className="text-slate-700 underline-offset-2 hover:underline">
            {result.exceptionCase.caseReference}
          </Link>
        ) : (
          "—"
        ),
    },
  ];

  return (
    <DataTable
      caption="Reconciliation results"
      columns={columns}
      rows={results}
      rowKey={(result) => result.id}
      emptyState={<EmptyState title="No results" description="This run produced no reconciliation results." />}
    />
  );
}
