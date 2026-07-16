"use server";

import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n/dictionaries";

export async function setLocale(locale: Locale) {
  const profile = await requireProfile();
  if (!SUPPORTED_LOCALES.includes(locale)) return;

  const supabase = await createClient();
  await supabase.from("profiles").update({ locale }).eq("id", profile.id);
  revalidatePath("/clean");
}
