import type { ReactNode } from "react";
import { NavLink } from "@/components/layout/NavLink";
import { getCurrentUserOrNull } from "@/lib/acting-user";
import { logoutAction } from "@/lib/actions/auth";

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
  const currentUser = await getCurrentUserOrNull();

  // No session (e.g. /login) -- proxy.ts already redirects every other route here, so render
  // bare children with none of the authenticated app chrome below.
  if (!currentUser) {
    return <div className="flex min-h-screen flex-col">{children}</div>;
  }

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
          <form action={logoutAction} className="flex items-center gap-2 text-xs">
            <span className="text-slate-600">
              {currentUser.name} <span className="text-slate-400">({currentUser.role.replace(/_/g, " ")})</span>
            </span>
            <button type="submit" className="rounded-md border border-slate-300 px-2 py-1 text-slate-700 hover:bg-slate-50">
              Log out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
