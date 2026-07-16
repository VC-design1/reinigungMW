"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth";

export async function markNotificationRead(id: string) {
  await requireProfile(["admin", "landlord"]);
  const supabase = await createClient();
  await supabase.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}

export async function markAllNotificationsRead() {
  const profile = await requireProfile(["admin", "landlord"]);
  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);
  revalidatePath("/admin/notifications");
  revalidatePath("/admin");
}
