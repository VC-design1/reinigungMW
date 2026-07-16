import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { AlertTriangle, Bell, CheckCircle2, Clock } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead, markNotificationRead } from "./actions";
import type { NotificationType } from "@/lib/types";

const ICONS: Record<NotificationType, typeof CheckCircle2> = {
  cleaning_completed: CheckCircle2,
  issue_reported: AlertTriangle,
  cleaning_overdue: Clock,
  cleaning_reminder: Bell,
};

export default async function NotificationsPage() {
  const profile = await requireProfile(["admin", "landlord"]);
  const supabase = await createClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const list = notifications ?? [];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Benachrichtigungen</h1>
        <form action={markAllNotificationsRead}>
          <Button type="submit" variant="outline" size="sm">
            Alle als gelesen markieren
          </Button>
        </form>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-slate-400">Keine Benachrichtigungen.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {list.map((n) => {
            const Icon = ICONS[n.type as NotificationType] ?? CheckCircle2;
            return (
              <Card key={n.id} className={n.read_at ? "opacity-60" : undefined}>
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div className="flex items-start gap-3">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="text-xs text-slate-400">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: de })}
                      </p>
                    </div>
                  </div>
                  {!n.read_at && (
                    <form action={markNotificationRead.bind(null, n.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Gelesen
                      </Button>
                    </form>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
