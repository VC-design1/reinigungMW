import { formatDistanceToNow } from "date-fns";
import { de } from "date-fns/locale";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ISSUE_CATEGORY_LABELS, type IssueCategory } from "@/lib/types";

export default async function InsightsPage() {
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const { data: issues } = await supabase
    .from("issue_reports")
    .select("apartment_id, category, description, created_at, apartments(name)")
    .eq("org_id", profile.org_id)
    .order("created_at", { ascending: false });

  const groups = new Map<
    string,
    {
      apartmentName: string;
      category: IssueCategory;
      description: string;
      count: number;
      lastReported: string;
    }
  >();

  for (const issue of issues ?? []) {
    const apartment = Array.isArray(issue.apartments) ? issue.apartments[0] : issue.apartments;
    const key = `${issue.apartment_id}|${issue.category}|${issue.description.trim().toLowerCase()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        apartmentName: apartment?.name ?? "—",
        category: issue.category as IssueCategory,
        description: issue.description,
        count: 0,
        lastReported: issue.created_at,
      });
    }
    groups.get(key)!.count += 1;
  }

  const recurring = [...groups.values()]
    .filter((g) => g.count >= 2)
    .sort((a, b) => b.count - a.count);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Inventar- &amp; Schadens-Auswertung</h1>
        <p className="text-sm text-slate-500">
          Wiederholt gemeldete Probleme (gleiche Wohnung, Kategorie und Beschreibung, mindestens 2x gemeldet).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wiederkehrende Meldungen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {recurring.length === 0 ? (
            <p className="text-sm text-slate-400">Noch keine wiederkehrenden Meldungen erkannt.</p>
          ) : (
            recurring.map((g, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{g.apartmentName}</p>
                    <Badge>{ISSUE_CATEGORY_LABELS[g.category]}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-slate-600">{g.description}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    zuletzt gemeldet{" "}
                    {formatDistanceToNow(new Date(g.lastReported), { addSuffix: true, locale: de })}
                  </p>
                </div>
                <Badge variant="red">{g.count}×</Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
