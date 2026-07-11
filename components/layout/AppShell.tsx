import type { ReactNode } from "react";
import { NavLink } from "@/components/layout/NavLink";

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

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-3">
          <span className="text-sm font-semibold tracking-wide text-slate-900">
            PayGuard <span className="text-slate-400">IE</span>
          </span>
          <nav aria-label="Primary" className="flex flex-wrap gap-1">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href} label={item.label} />
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{children}</main>
    </div>
  );
}
