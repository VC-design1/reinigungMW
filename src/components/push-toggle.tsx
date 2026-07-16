"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getPushSubscriptionStatus,
  isPushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push/client";

export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported() || !process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(true);
    getPushSubscriptionStatus().then(setSubscribed);
  }, []);

  if (!supported) return null;

  async function toggle() {
    setBusy(true);
    try {
      if (subscribed) {
        await unsubscribeFromPush();
        setSubscribed(false);
      } else {
        const ok = await subscribeToPush();
        setSubscribed(ok);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button type="button" variant="ghost" size="icon" disabled={busy} onClick={toggle} title="Push-Benachrichtigungen">
      {subscribed ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-slate-400" />}
    </Button>
  );
}
