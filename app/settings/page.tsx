import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { UserManagementTable } from "@/components/settings/UserManagementTable";
import { CreateUserForm } from "@/components/settings/CreateUserForm";
import { getActingUser } from "@/lib/acting-user";
import { getAllUsers } from "@/lib/queries/users";
import { hasPermission, USER_ROLES } from "@/lib/auth/permissions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const actor = await getActingUser();
  const canManageUsers = hasPermission(actor.role, "USER_MANAGE");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Settings"
        description="Platform configuration for users, roles and operational thresholds."
      />

      {canManageUsers ? (
        <>
          <Card title="Add user">
            <CreateUserForm roles={USER_ROLES} />
          </Card>
          <Card title="Users">
            <UserManagementTable users={await getAllUsers()} roles={USER_ROLES} />
          </Card>
        </>
      ) : (
        <Card title="Users">
          <p className="text-sm text-slate-600">User and role management is limited to admins.</p>
        </Card>
      )}

      <Card title="Planned for a future sprint">
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
          <li>Configurable SLA thresholds per payment method and currency</li>
          <li>Supported currency and payment method administration</li>
        </ul>
      </Card>
    </div>
  );
}
