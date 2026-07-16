import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function ApartmentsPage() {
  const profile = await requireProfile(["admin", "landlord"]);
  const supabase = await createClient();

  const { data: apartments } = await supabase
    .from("apartments")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("name", { ascending: true });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Wohnungen</h1>
        <Link href="/admin/apartments/new">
          <Button size="sm">Neue Wohnung</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(apartments ?? []).map((apt) => (
          <Link key={apt.id} href={`/admin/apartments/${apt.id}`}>
            <Card className="h-full transition hover:border-slate-300">
              <CardContent className="flex flex-col gap-2 p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-slate-900">{apt.name}</p>
                  {apt.status === "archived" && <Badge>Archiviert</Badge>}
                </div>
                <p className="text-sm text-slate-500">{apt.address}</p>
                <div className="flex gap-2">
                  <Badge variant={apt.occupancy_status === "free" ? "green" : "amber"}>
                    {apt.occupancy_status === "free" ? "Frei" : "Belegt"}
                  </Badge>
                  <Badge>{apt.room_count} Zimmer</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(apartments ?? []).length === 0 && (
        <p className="text-sm text-slate-400">Noch keine Wohnungen angelegt.</p>
      )}
    </div>
  );
}
