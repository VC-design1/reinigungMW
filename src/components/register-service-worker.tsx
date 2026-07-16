"use client";

import { useEffect } from "react";

export function RegisterServiceWorker() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    if (process.env.NODE_ENV !== "production") {
      // Im Dev-Modus darf kein Service Worker aktiv sein: seine cache-first-
      // Strategie für /_next/static/ liefert nach Code-Änderungen veraltetes
      // CSS/JS aus. Vorhandene Registrierungen (aus früheren Sessions) werden
      // entfernt und alle Caches geleert, damit der Browser wieder frisch lädt.
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => registrations.forEach((r) => r.unregister()))
        .catch(() => {});
      if ("caches" in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
          .catch(() => {});
      }
      return;
    }

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // registration failures (e.g. unsupported browser) are non-fatal —
      // the app still works fully online, just without offline app-shell caching.
    });
  }, []);

  return null;
}
