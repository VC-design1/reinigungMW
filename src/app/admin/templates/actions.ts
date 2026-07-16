"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { templateSchema } from "@/lib/validation/template";

export async function createTemplate(formData: FormData) {
  const profile = await requireProfile("admin");
  const raw = {
    name: formData.get("name"),
    description: formData.get("description") ?? undefined,
    items: JSON.parse((formData.get("items_json") as string) || "[]"),
  };
  const parsed = templateSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/templates/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();
  const { data: template, error } = await supabase
    .from("checklist_templates")
    .insert({ name: parsed.data.name, description: parsed.data.description, org_id: profile.org_id })
    .select()
    .single();
  if (error || !template) {
    redirect(`/admin/templates/new?error=${encodeURIComponent(error?.message ?? "Fehler")}`);
  }

  const { error: itemsError } = await supabase.from("checklist_template_items").insert(
    parsed.data.items.map((item, index) => ({
      template_id: template.id,
      room_name: item.room_name,
      label: item.label,
      position: index,
    }))
  );
  if (itemsError) {
    redirect(`/admin/templates/new?error=${encodeURIComponent(itemsError.message)}`);
  }

  revalidatePath("/admin/templates");
  redirect(`/admin/templates/${template.id}`);
}

export async function deleteTemplate(templateId: string) {
  await requireProfile("admin");
  const supabase = await createClient();
  await supabase.from("checklist_templates").delete().eq("id", templateId);
  revalidatePath("/admin/templates");
  redirect("/admin/templates");
}

export async function addTemplateItem(templateId: string, formData: FormData) {
  await requireProfile("admin");
  const room_name = formData.get("room_name") as string;
  const label = formData.get("label") as string;
  if (!room_name || !label) return;

  const supabase = await createClient();
  const { count } = await supabase
    .from("checklist_template_items")
    .select("id", { count: "exact", head: true })
    .eq("template_id", templateId);

  await supabase
    .from("checklist_template_items")
    .insert({ template_id: templateId, room_name, label, position: count ?? 0 });
  revalidatePath(`/admin/templates/${templateId}`);
}

export async function removeTemplateItem(templateId: string, itemId: string) {
  await requireProfile("admin");
  const supabase = await createClient();
  await supabase.from("checklist_template_items").delete().eq("id", itemId);
  revalidatePath(`/admin/templates/${templateId}`);
}
