import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime } from "@/lib/format";
import type { ReconciliationResult, ReconciliationRun } from "@/app/generated/prisma/client";

interface TriggeringResultCardProps {
  result: (ReconciliationResult & { reconciliationRun: ReconciliationRun }) | undefined;
}

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

/** Rules store expected/actual as opaque strings (a date, an amount, a currency code, a reference).
 * Format it as a date only when it actually looks like one; otherwise show it as-is. */
function formatRuleValue(value: string | null): string {
  if (!value) return "—";
  return ISO_DATE_PATTERN.test(value) ? formatDateTime(value) : value;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{children}</dd>
    </div>
  );
}

export function TriggeringResultCard({ result }: TriggeringResultCardProps) {
  return (
    <Card title="Triggering reconciliation result">
      {!result ? (
        <EmptyState
          title="No reconciliation result linked"
          description="This exception was not created by an automated reconciliation run."
        />
      ) : (
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Run">
            <Link href={`/reconciliation/${result.reconciliationRun.id}`} className="underline-offset-2 hover:underline">
              {result.reconciliationRun.runReference}
            </Link>
          </Field>
          <Field label="Expected">{formatRuleValue(result.expectedValue)}</Field>
          <Field label="Actual">{formatRuleValue(result.actualValue)}</Field>
          <Field label="Difference (minor units)">{result.differenceMinor ?? "—"}</Field>
        </dl>
      )}
    </Card>
  );
}
