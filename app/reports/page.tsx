import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const REPORTS: { type: string; title: string; description: string }[] = [
  {
    type: "reconciliation",
    title: "Reconciliation Run Summary",
    description: "Every reconciliation run: totals, pass/fail counts and exceptions created.",
  },
  {
    type: "exceptions",
    title: "Exception Queue Report",
    description: "Every exception case with status, ownership and SLA state — audit-evidence ready.",
  },
  {
    type: "uat",
    title: "UAT Summary Report",
    description: "Latest result for every UAT test case, plus an overall release recommendation.",
  },
  {
    type: "payments",
    title: "Payments & Settlements Summary",
    description: "Every payment, its settlement status and amount.",
  },
];

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
    >
      {label}
    </a>
  );
}

export default function ReportsPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Reports"
        description="Control-evidence exports and operational reporting, generated live from the current data — no scheduling, storage or templating, but genuinely functional exports."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {REPORTS.map((report) => (
          <Card key={report.type} title={report.title}>
            <p className="text-sm text-slate-600">{report.description}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <DownloadLink href={`/reports/${report.type}?format=markdown`} label="Download Markdown" />
              <DownloadLink href={`/reports/${report.type}?format=csv`} label="Download CSV" />
              <DownloadLink href={`/reports/${report.type}?format=html`} label="View / print HTML" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
