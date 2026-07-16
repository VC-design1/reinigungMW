"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { jobSchema } from "@/lib/validation/job";

export async function createJob(formData: FormData) {
  const profile = await requireProfile("admin");
  const raw = Object.fromEntries(formData.entries());
  const parsed = jobSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/jobs/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();
  const { data: job, error } = await supabase
    .from("cleaning_jobs")
    .insert({
      org_id: profile.org_id,
      apartment_id: parsed.data.apartment_id,
      assigned_to: parsed.data.assigned_to || null,
      checklist_template_id: parsed.data.checklist_template_id || null,
      scheduled_date: parsed.data.scheduled_date,
      scheduled_start: parsed.data.scheduled_start || null,
      scheduled_end: parsed.data.scheduled_end || null,
      created_by: profile.id,
    })
    .select()
    .single();

  if (error || !job) {
    redirect(`/admin/jobs/new?error=${encodeURIComponent(error?.message ?? "Fehler beim Anlegen")}`);
  }

  if (parsed.data.checklist_template_id) {
    const { data: templateItems } = await supabase
      .from("checklist_template_items")
      .select("room_name, label")
      .eq("template_id", parsed.data.checklist_template_id);

    if (templateItems && templateItems.length > 0) {
      await supabase.from("cleaning_job_checklist_results").insert(
        templateItems.map((item) => ({
          cleaning_job_id: job.id,
          org_id: profile.org_id,
          room_name: item.room_name,
          label: item.label,
        }))
      );
    }
  }

  revalidatePath("/admin/jobs");
  revalidatePath(`/admin/apartments/${parsed.data.apartment_id}`);
  redirect("/admin/jobs");
}

export async function cancelJob(jobId: string) {
  await requireProfile("admin");
  const supabase = await createClient();
  await supabase.from("cleaning_jobs").delete().eq("id", jobId);
  revalidatePath("/admin/jobs");
}
