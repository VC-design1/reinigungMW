"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

const NAV: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["admin", "landlord"] },
  { href: "/admin/calendar", label: "Kalender", roles: ["admin", "landlord"] },
  { href: "/admin/apartments", label: "Wohnungen", roles: ["admin", "landlord"] },
  { href: "/admin/templates", label: "Checklisten", roles: ["admin"] },
  { href: "/admin/jobs", label: "Aufträge", roles: ["admin", "landlord"] },
  { href: "/admin/team", label: "Team", roles: ["admin"] },
  { href: "/admin/stats", label: "Statistik", roles: ["admin"] },
  { href: "/admin/insights", label: "Auswertung", roles: ["admin"] },
];

export function AdminNav({ role }: { role: UserRole }) {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {NAV.filter((item) => item.roles.includes(role)).map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-colors",
              active
                ? "border-brand-700 font-semibold text-slate-900"
                : "border-transparent font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
