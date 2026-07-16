"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/calendar", label: "Kalender" },
  { href: "/admin/apartments", label: "Wohnungen" },
  { href: "/admin/templates", label: "Checklisten" },
  { href: "/admin/jobs", label: "Aufträge" },
  { href: "/admin/team", label: "Team" },
  { href: "/admin/stats", label: "Statistik" },
  { href: "/admin/insights", label: "Auswertung" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex gap-1 overflow-x-auto">
      {NAV.map((item) => {
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
