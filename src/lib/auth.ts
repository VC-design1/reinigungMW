import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile, UserRole } from "@/lib/types";

/** Startseite je Rolle: Admin und Vermieter teilen sich den /admin-Bereich
 * (der Vermieter sieht dort per RLS nur seine eigenen Wohnungen). */
export function homeForRole(role: UserRole): string {
  return role === "cleaner" ? "/clean" : "/admin";
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (data as Profile) ?? null;
}

export async function requireProfile(role?: UserRole | UserRole[]): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || !profile.active) {
    redirect("/login");
  }
  if (role) {
    const allowed = Array.isArray(role) ? role : [role];
    if (!allowed.includes(profile.role)) {
      redirect(homeForRole(profile.role));
    }
  }
  return profile;
}
