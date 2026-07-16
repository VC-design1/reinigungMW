import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "./notifications/notification-bell";
import { createClient } from "@/lib/supabase/server";
import { PushToggle } from "@/components/push-toggle";
import { BrandMark } from "@/components/brand-mark";
import { AdminNav } from "./admin-nav";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile("admin");
  const supabase = await createClient();
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", profile.id)
    .is("read_at", null);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-3">
              <BrandMark />
              <div className="leading-tight">
                <p className="text-sm font-semibold tracking-tight text-slate-900">
                  Reinigungsmanagement
                </p>
                <p className="text-xs text-slate-500">Vermieter-Bereich</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <PushToggle />
              <NotificationBell unreadCount={unreadCount ?? 0} />
              <span className="hidden px-2 text-sm text-slate-600 sm:inline">
                {profile.full_name}
              </span>
              <LogoutButton />
            </div>
          </div>
          <AdminNav />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
