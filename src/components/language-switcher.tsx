"use client";

import { useTransition } from "react";
import { setLocale } from "@/app/clean/actions";
import type { Locale } from "@/lib/i18n/dictionaries";

const OPTIONS: { value: Locale; label: string }[] = [
  { value: "de", label: "DE" },
  { value: "en", label: "EN" },
];

export function LanguageSwitcher({ current }: { current: Locale }) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex overflow-hidden rounded-md border border-slate-200 text-xs">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={pending || opt.value === current}
          onClick={() => startTransition(() => setLocale(opt.value))}
          className={`px-2 py-1 ${
            opt.value === current ? "bg-slate-900 text-white" : "bg-white text-slate-500 hover:bg-slate-50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
