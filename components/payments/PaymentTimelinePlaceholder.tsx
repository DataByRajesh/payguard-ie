import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export function PaymentTimelinePlaceholder() {
  return (
    <Card title="Lifecycle timeline">
      <EmptyState
        title="Event timeline coming in a future sprint"
        description="This will show every status transition, settlement match and exception event for this payment, in chronological order, sourced from the audit log."
      />
    </Card>
  );
}
