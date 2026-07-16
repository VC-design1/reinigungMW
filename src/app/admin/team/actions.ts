"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamMemberSchema } from "@/lib/validation/team";

export async function createTeamMember(formData: FormData) {
  const profile = await requireProfile("admin");
  const parsed = createTeamMemberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(`/admin/team?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: {
      org_id: profile.org_id,
      role: parsed.data.role,
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
    },
  });

  if (error) {
    redirect(`/admin/team?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/team");
  redirect("/admin/team?created=1");
}

export async function setMemberActive(memberId: string, active: boolean) {
  const profile = await requireProfile("admin");
  if (memberId === profile.id) return; // can't deactivate yourself
  const supabase = await createClient();
  await supabase.from("profiles").update({ active }).eq("id", memberId);
  revalidatePath("/admin/team");
}
