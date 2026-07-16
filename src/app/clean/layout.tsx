import type { ReactNode } from "react";
import { requireProfile } from "@/lib/auth";
import { SyncStatusBadge } from "@/components/sync-status-badge";
import { LogoutButton } from "@/components/logout-button";
import { PushToggle } from "@/components/push-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { BrandMark } from "@/components/brand-mark";
import { getDictionary, type Locale } from "@/lib/i18n/dictionaries";

export default async function CleanLayout({ children }: { children: ReactNode }) {
  const profile = await requireProfile();
  const locale = (profile.locale === "en" ? "en" : "de") as Locale;
  const dict = getDictionary(locale);

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <BrandMark />
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-tight text-slate-900">{dict.appName}</p>
              <p className="text-xs text-slate-500">{profile.full_name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SyncStatusBadge dict={dict.sync} />
            <PushToggle />
            <LanguageSwitcher current={locale} />
            <LogoutButton label={dict.logout} />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-lg px-4 py-5 pb-20">{children}</main>
    </div>
  );
}
