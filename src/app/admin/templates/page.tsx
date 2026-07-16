import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default async function TemplatesPage() {
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const { data: templates } = await supabase
    .from("checklist_templates")
    .select("*, checklist_template_items(count)")
    .eq("org_id", profile.org_id)
    .order("name");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Checklisten-Vorlagen</h1>
        <Link href="/admin/templates/new">
          <Button size="sm">Neue Vorlage</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(templates ?? []).map((tpl) => (
          <Link key={tpl.id} href={`/admin/templates/${tpl.id}`}>
            <Card className="h-full transition hover:border-slate-300">
              <CardContent className="p-4">
                <p className="font-medium text-slate-900">{tpl.name}</p>
                {tpl.description && <p className="text-sm text-slate-500">{tpl.description}</p>}
                <p className="mt-2 text-xs text-slate-400">
                  {(tpl.checklist_template_items as unknown as { count: number }[])?.[0]?.count ?? 0} Punkte
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {(templates ?? []).length === 0 && (
        <p className="text-sm text-slate-400">Noch keine Vorlagen angelegt.</p>
      )}
    </div>
  );
}
