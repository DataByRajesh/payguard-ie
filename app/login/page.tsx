import { LoginForm } from "@/components/auth/LoginForm";
import { getAssignableUsers } from "@/lib/acting-user";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const users = await getAssignableUsers();
  const demoPassword = process.env.SEED_USER_PASSWORD ?? "payguard-demo";

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div>
        <h1 className="text-lg font-semibold text-slate-900">
          PayGuard <span className="text-slate-400">IE</span>
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Sign in to explore the payments operations, reconciliation and control-evidence platform.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <LoginForm />
      </div>

      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
        <p className="font-medium">Demo data -- every seeded user shares one password</p>
        <p className="mt-1">
          Password: <code className="rounded bg-amber-100 px-1 py-0.5">{demoPassword}</code>. Sign in as any
          user below to explore the app as that role.
        </p>
        <ul className="mt-2 max-h-48 space-y-0.5 overflow-y-auto">
          {users.map((user) => (
            <li key={user.id}>
              {user.email} <span className="text-amber-700">({user.role.replace(/_/g, " ")})</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
