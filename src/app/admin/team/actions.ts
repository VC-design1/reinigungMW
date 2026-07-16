"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamMemberSchema, updateTeamMemberSchema } from "@/lib/validation/team";
import type { Profile } from "@/lib/types";

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

/**
 * Schutzregel für Profil-Änderungen: Admin-Accounts gehören ihren Inhabern —
 * ein Admin darf jedes Vermieter-/Reinigungskraft-Profil und sein eigenes
 * bearbeiten, aber nicht das Profil eines anderen Admins. Ausnahme ist der
 * Superadmin (Inhaber-Account, Flag nur per SQL setzbar): Er darf auch fremde
 * Admin-Profile verwalten. Das Superadmin-Profil selbst kann ausschließlich
 * sein Inhaber ändern. Dieselben Regeln sind zusätzlich in der RLS-Policy
 * (profiles_update_admin, Migration 0004) verankert.
 */
function canManage(
  actor: Profile,
  target: { id: string; role: string; is_superadmin?: boolean }
): boolean {
  if (target.id === actor.id) return true;
  if (target.is_superadmin) return false;
  if (target.role === "admin") return actor.is_superadmin === true;
  return true;
}

export async function updateTeamMember(memberId: string, formData: FormData) {
  const profile = await requireProfile("admin");
  const parsed = updateTeamMemberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(
      `/admin/team/${memberId}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_superadmin")
    .eq("id", memberId)
    .single();
  if (!target) redirect("/admin/team");

  if (!canManage(profile, target)) {
    redirect(
      `/admin/team?error=${encodeURIComponent("Dieses Profil kann nur vom Inhaber selbst bearbeitet werden.")}`
    );
  }
  // Fremde Profile dürfen nicht zu Admins hochgestuft werden (Eskalationsschutz);
  // die eigene Rolle kann man nicht ändern, um versehentliche Selbst-Aussperrung
  // (letzter Admin wird Vermieter) zu vermeiden.
  const nextRole = target.id === profile.id ? profile.role : parsed.data.role;
  if (target.id !== profile.id && target.role !== "admin" && parsed.data.role === "admin") {
    redirect(
      `/admin/team/${memberId}/edit?error=${encodeURIComponent("Bestehende Profile können nicht zu Admins hochgestuft werden — lege dafür unter Team einen neuen Admin-Account an.")}`
    );
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      role: nextRole,
      active: target.id === profile.id ? true : parsed.data.active,
    })
    .eq("id", memberId);

  if (error) {
    redirect(`/admin/team/${memberId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/team");
  redirect("/admin/team?updated=1");
}

export async function setMemberActive(memberId: string, active: boolean) {
  const profile = await requireProfile("admin");
  if (memberId === profile.id) return; // sich selbst nicht deaktivieren

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_superadmin")
    .eq("id", memberId)
    .single();
  if (!target || !canManage(profile, target)) return; // fremde Admins nur als Superadmin

  await supabase.from("profiles").update({ active }).eq("id", memberId);
  revalidatePath("/admin/team");
}

/**
 * Löscht einen Account endgültig (Auth-User + Profil). Die Reinigungshistorie
 * bleibt erhalten — Verweise auf die gelöschte Person werden auf NULL gesetzt
 * (Migration 0004). Regeln:
 *  - niemand löscht sich selbst,
 *  - das Superadmin-Profil ist unlöschbar,
 *  - Admin-Accounts kann nur der Superadmin löschen,
 *  - Vermieter/Reinigungskräfte kann jeder Admin löschen.
 */
export async function deleteTeamMember(memberId: string) {
  const profile = await requireProfile("admin");
  if (memberId === profile.id) {
    redirect(`/admin/team?error=${encodeURIComponent("Du kannst deinen eigenen Account nicht löschen.")}`);
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_superadmin, full_name")
    .eq("id", memberId)
    .single();
  if (!target) redirect("/admin/team");

  if (target.is_superadmin) {
    redirect(`/admin/team?error=${encodeURIComponent("Der Superadmin-Account kann nicht gelöscht werden.")}`);
  }
  if (target.role === "admin" && !profile.is_superadmin) {
    redirect(
      `/admin/team?error=${encodeURIComponent("Admin-Accounts kann nur der Superadmin löschen.")}`
    );
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(memberId);
  if (error) {
    redirect(`/admin/team?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/team");
  redirect("/admin/team?deleted=1");
}
