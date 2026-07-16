import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { createJob } from "../actions";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await requireProfile(["admin", "landlord"]);
  const supabase = await createClient();

  const [{ data: apartments }, { data: cleaners }, { data: templates }] = await Promise.all([
    supabase
      .from("apartments")
      .select("id, name")
      .eq("org_id", profile.org_id)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", profile.org_id)
      .eq("role", "cleaner")
      .eq("active", true)
      .order("full_name"),
    supabase.from("checklist_templates").select("id, name").eq("org_id", profile.org_id).order("name"),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Neuer Reinigungsauftrag</h1>
      <form action={createJob} className="flex max-w-lg flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="apartment_id">Wohnung</Label>
          <Select id="apartment_id" name="apartment_id" required defaultValue="">
            <option value="" disabled>
              Wohnung auswählen
            </option>
            {(apartments ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="assigned_to">Reinigungskraft</Label>
          <Select id="assigned_to" name="assigned_to" defaultValue="">
            <option value="">Noch nicht zuweisen</option>
            {(cleaners ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.full_name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="checklist_template_id">Checklisten-Vorlage</Label>
          <Select id="checklist_template_id" name="checklist_template_id" defaultValue="">
            <option value="">Keine</option>
            {(templates ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="scheduled_date">Datum</Label>
          <Input id="scheduled_date" name="scheduled_date" type="date" required />
        </div>
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="scheduled_start">Start (optional)</Label>
            <Input id="scheduled_start" name="scheduled_start" type="time" />
          </div>
          <div className="flex flex-1 flex-col gap-1.5">
            <Label htmlFor="scheduled_end">Ende (optional)</Label>
            <Input id="scheduled_end" name="scheduled_end" type="time" />
          </div>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit">Auftrag anlegen</Button>
      </form>
    </div>
  );
}
