import type { ReactNode } from "react";
import { NavLink } from "@/components/layout/NavLink";
import { ActingUserSelector } from "@/components/layout/ActingUserSelector";
import { getAssignableUsers, getActingUser } from "@/lib/acting-user";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/payments", label: "Payments" },
  { href: "/settlements", label: "Settlements" },
  { href: "/reconciliation", label: "Reconciliation" },
  { href: "/exceptions", label: "Exceptions" },
  { href: "/uat", label: "UAT" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings" },
];

export async function AppShell({ children }: { children: ReactNode }) {
  const [users, actingUser] = await Promise.all([getAssignableUsers(), getActingUser()]);

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-3">
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm font-semibold tracking-wide text-slate-900">
              PayGuard <span className="text-slate-400">IE</span>
            </span>
            <span
              title="All data in this environment is synthetic — no real customers, payments or bank connectivity."
              className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800"
            >
              Demo data
            </span>
            <nav aria-label="Primary" className="flex flex-wrap gap-1">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.href} href={item.href} label={item.label} />
              ))}
            </nav>
          </div>
          <ActingUserSelector users={users} actingUserId={actingUser.id} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
