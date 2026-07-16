"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const ratingSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  comment: z.string().optional(),
});

export async function rateCleaningJob(
  apartmentId: string,
  jobId: string,
  cleanerId: string | null,
  formData: FormData
) {
  const profile = await requireProfile("admin");
  const parsed = ratingSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("cleaning_ratings").upsert(
    {
      cleaning_job_id: jobId,
      org_id: profile.org_id,
      apartment_id: apartmentId,
      cleaner_id: cleanerId,
      rating: parsed.data.rating,
      comment: parsed.data.comment || null,
      rated_by: profile.id,
    },
    { onConflict: "cleaning_job_id" }
  );

  revalidatePath(`/admin/apartments/${apartmentId}/jobs/${jobId}`);
}
