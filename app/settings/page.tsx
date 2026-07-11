import { PlaceholderPage } from "@/components/placeholders/PlaceholderPage";

export default function SettingsPage() {
  return (
    <PlaceholderPage
      title="Settings"
      description="Platform configuration for users, roles and operational thresholds."
      upcoming={[
        "User and role management (ops analyst, app support, UAT lead, admin)",
        "Configurable SLA thresholds per payment method and currency",
        "Supported currency and payment method administration",
      ]}
    />
  );
}
