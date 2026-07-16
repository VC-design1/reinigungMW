"use client";

import { useEffect, useState, useCallback } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { getQueue } from "@/lib/offline/queue";
import { flushOfflineQueue } from "@/lib/offline/sync";
import { Badge } from "@/components/ui/badge";
import { dictionaries, type Dictionary } from "@/lib/i18n/dictionaries";

interface Props {
  dict?: Dictionary["sync"];
}

export function SyncStatusBadge({ dict = dictionaries.de.sync }: Props) {
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const refreshCount = useCallback(async () => {
    const queue = await getQueue();
    setPending(queue.length);
  }, []);

  const trySync = useCallback(async () => {
    if (!navigator.onLine) return;
    setSyncing(true);
    try {
      await flushOfflineQueue();
    } finally {
      setSyncing(false);
      await refreshCount();
    }
  }, [refreshCount]);

  useEffect(() => {
    // Initial sync with browser/external state on mount (online flag,
    // IndexedDB queue length) — neither can be derived during render.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    refreshCount();

    const onOnline = () => {
      setOnline(true);
      trySync();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const interval = setInterval(trySync, 30_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(interval);
    };
  }, [refreshCount, trySync]);

  if (online && pending === 0 && !syncing) return null;

  return (
    <Badge variant={online ? "blue" : "amber"} className="animate-in fade-in">
      {!online ? (
        <>
          <WifiOff className="h-3.5 w-3.5" /> {dict.offline}
          {pending > 0 && ` – ${pending} ${dict.pendingSuffix}`}
        </>
      ) : syncing ? (
        <>
          <RefreshCw className="h-3.5 w-3.5 animate-spin" /> {dict.syncing}
        </>
      ) : (
        <>
          <CheckCircle2 className="h-3.5 w-3.5" /> {pending} {dict.pending}
        </>
      )}
    </Badge>
  );
}
