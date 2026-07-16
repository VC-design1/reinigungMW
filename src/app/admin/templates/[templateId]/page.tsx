import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { addTemplateItem, deleteTemplate, removeTemplateItem } from "../actions";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ templateId: string }>;
}) {
  const { templateId } = await params;
  await requireProfile("admin");
  const supabase = await createClient();

  const { data: template } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("id", templateId)
    .single();
  if (!template) notFound();

  const { data: items } = await supabase
    .from("checklist_template_items")
    .select("*")
    .eq("template_id", templateId)
    .order("room_name")
    .order("position");

  const byRoom = new Map<string, typeof items>();
  for (const item of items ?? []) {
    if (!byRoom.has(item.room_name)) byRoom.set(item.room_name, []);
    byRoom.get(item.room_name)!.push(item);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{template.name}</h1>
          {template.description && <p className="text-sm text-slate-500">{template.description}</p>}
        </div>
        <form action={deleteTemplate.bind(null, template.id)}>
          <Button type="submit" variant="destructive" size="sm">
            Vorlage löschen
          </Button>
        </form>
      </div>

      <div className="flex flex-col gap-4">
        {[...byRoom.entries()].map(([room, roomItems]) => (
          <Card key={room}>
            <CardHeader>
              <CardTitle>{room}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {roomItems!.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-sm">
                  <span>{item.label}</span>
                  <form action={removeTemplateItem.bind(null, template.id, item.id)}>
                    <Button type="submit" size="sm" variant="ghost">
                      Entfernen
                    </Button>
                  </form>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        <Card>
          <CardHeader>
            <CardTitle>Punkt hinzufügen</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addTemplateItem.bind(null, template.id)} className="flex gap-2">
              <Input name="room_name" placeholder="Raum" required className="w-40" />
              <Input name="label" placeholder="Aufgabe" required className="flex-1" />
              <Button type="submit" size="sm" variant="outline">
                Hinzufügen
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
