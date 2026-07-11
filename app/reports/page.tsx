import { PlaceholderPage } from "@/components/placeholders/PlaceholderPage";

export default function ReportsPage() {
  return (
    <PlaceholderPage
      title="Reports"
      description="Control-evidence exports and operational reporting for audit and stakeholder review."
      upcoming={[
        "Scheduled reconciliation and exception summary exports",
        "Control-evidence packs suitable for audit sign-off",
        "Configurable report templates by regulatory requirement",
      ]}
    />
  );
}
