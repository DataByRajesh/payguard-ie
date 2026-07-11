import Link from "next/link";
import { PlaceholderPage } from "@/components/placeholders/PlaceholderPage";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExceptionSeverityBadge, ExceptionStatusBadge } from "@/components/badges";
import { formatDate } from "@/lib/format";
import { getRecentExceptionCases } from "@/lib/queries/exceptions";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage() {
  const exceptionCases = await getRecentExceptionCases();

  return (
    <PlaceholderPage
      title="Exceptions"
      description="Investigation workflow for reconciliation and processing exceptions. This sprint shows a read-only list of raised cases; assignment, SLA timers and resolution workflow are planned next."
      upcoming={[
        "Case assignment, SLA timers and escalation rules",
        "Bulk actions and saved investigation views",
        "Linked control-evidence attachment directly from a case",
      ]}
      preview={
        <Card title="Recent exception cases (read-only preview)">
          {exceptionCases.length === 0 ? (
            <EmptyState title="No exception cases yet" description="Seed the database to see preview data." />
          ) : (
            <ul className="flex flex-col gap-3">
              {exceptionCases.map((exceptionCase) => (
                <li key={exceptionCase.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 p-3">
                  <div>
                    <Link
                      href={`/payments/${exceptionCase.paymentId}`}
                      className="text-sm font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {exceptionCase.caseReference}
                    </Link>
                    <p className="text-sm text-slate-600">{exceptionCase.title}</p>
                    <p className="text-xs text-slate-400">Opened {formatDate(exceptionCase.openedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <ExceptionSeverityBadge severity={exceptionCase.severity} />
                    <ExceptionStatusBadge status={exceptionCase.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      }
    />
  );
}
