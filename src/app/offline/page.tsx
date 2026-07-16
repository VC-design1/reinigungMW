import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-slate-50 px-4 text-center">
      <WifiOff className="h-10 w-10 text-slate-400" />
      <p className="text-xl font-semibold tracking-tight text-slate-900">Keine Verbindung</p>
      <p className="max-w-xs text-sm text-slate-500">
        Diese Seite wurde noch nicht offline zwischengespeichert. Bereits geöffnete
        Reinigungsaufträge funktionieren weiter — Eingaben werden gespeichert und
        automatisch synchronisiert, sobald wieder eine Verbindung besteht.
      </p>
    </div>
  );
}
