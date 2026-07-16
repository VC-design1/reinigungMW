import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

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

export async function requireProfile(role?: "admin" | "cleaner"): Promise<Profile> {
  const profile = await getProfile();
  if (!profile || !profile.active) {
    redirect("/login");
  }
  if (role && profile.role !== role) {
    redirect(profile.role === "admin" ? "/admin" : "/clean");
  }
  return profile;
}
