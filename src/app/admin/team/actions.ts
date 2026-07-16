"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createTeamMemberSchema, updateTeamMemberSchema } from "@/lib/validation/team";
import type { Profile } from "@/lib/types";

export async function createTeamMember(formData: FormData) {
  const profile = await requireProfile(["admin", "landlord"]);
  const parsed = createTeamMemberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(`/admin/team?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  // Vermieter legen ausschließlich Reinigungskräfte an — verwaltet von ihnen
  // selbst (managed_by). Admins können jede Rolle anlegen.
  const isLandlord = profile.role === "landlord";
  if (isLandlord && parsed.data.role !== "cleaner") {
    redirect(`/admin/team?error=${encodeURIComponent("Vermieter können nur Reinigungskräfte anlegen.")}`);
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
      managed_by: isLandlord ? profile.id : undefined,
    },
  });

  if (error) {
    redirect(`/admin/team?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/team");
  redirect("/admin/team?created=1");
}

/**
 * Schutzregeln für Profil-Änderungen:
 *  - Jeder verwaltet sein eigenes Profil.
 *  - Das Superadmin-Profil kann ausschließlich sein Inhaber ändern.
 *  - Fremde Admin-Profile darf nur der Superadmin verwalten.
 *  - Admins verwalten alle Vermieter-/Reinigungskraft-Profile.
 *  - Vermieter verwalten nur die eigenen Reinigungskräfte (managed_by).
 * Dieselben Regeln sind zusätzlich als RLS-Policies verankert
 * (profiles_update_admin/landlord, Migrationen 0004/0005).
 */
function canManage(
  actor: Profile,
  target: { id: string; role: string; is_superadmin?: boolean; managed_by?: string | null }
): boolean {
  if (target.id === actor.id) return true;
  if (target.is_superadmin) return false;
  if (actor.role === "landlord") {
    return target.role === "cleaner" && target.managed_by === actor.id;
  }
  if (target.role === "admin") return actor.is_superadmin === true;
  return true;
}

export async function updateTeamMember(memberId: string, formData: FormData) {
  const profile = await requireProfile(["admin", "landlord"]);
  const parsed = updateTeamMemberSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    redirect(
      `/admin/team/${memberId}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_superadmin, managed_by")
    .eq("id", memberId)
    .single();
  if (!target) redirect("/admin/team");

  if (!canManage(profile, target)) {
    redirect(
      `/admin/team?error=${encodeURIComponent("Du darfst dieses Profil nicht bearbeiten.")}`
    );
  }
  // Fremde Profile dürfen nicht zu Admins hochgestuft werden (Eskalationsschutz);
  // die eigene Rolle kann man nicht ändern (Selbst-Aussperrung), und Vermieter
  // können die Rolle ihrer Reinigungskräfte nicht ändern.
  const nextRole =
    target.id === profile.id || profile.role === "landlord" ? target.role : parsed.data.role;
  if (target.id !== profile.id && target.role !== "admin" && nextRole === "admin") {
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
  const profile = await requireProfile(["admin", "landlord"]);
  if (memberId === profile.id) return; // sich selbst nicht deaktivieren

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_superadmin, managed_by")
    .eq("id", memberId)
    .single();
  if (!target || !canManage(profile, target)) return;

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
 *  - Vermieter/Reinigungskräfte kann jeder Admin löschen,
 *  - Vermieter löschen nur die eigenen Reinigungskräfte (managed_by).
 */
export async function deleteTeamMember(memberId: string) {
  const profile = await requireProfile(["admin", "landlord"]);
  if (memberId === profile.id) {
    redirect(`/admin/team?error=${encodeURIComponent("Du kannst deinen eigenen Account nicht löschen.")}`);
  }

  const supabase = await createClient();
  const { data: target } = await supabase
    .from("profiles")
    .select("id, role, is_superadmin, managed_by, full_name")
    .eq("id", memberId)
    .single();
  if (!target) redirect("/admin/team");

  if (target.is_superadmin) {
    redirect(`/admin/team?error=${encodeURIComponent("Der Superadmin-Account kann nicht gelöscht werden.")}`);
  }
  if (!canManage(profile, target)) {
    redirect(`/admin/team?error=${encodeURIComponent("Du darfst diesen Account nicht löschen.")}`);
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
