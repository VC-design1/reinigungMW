"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apartmentSchema, bookingSchema, inventoryItemSchema } from "@/lib/validation/apartment";
import { syncApartmentBookings } from "@/lib/ical/sync";

function formToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function normalizeApartmentInput(data: ReturnType<typeof apartmentSchema.parse>) {
  return { ...data, ical_url: data.ical_url || null };
}

export async function createApartment(formData: FormData) {
  const profile = await requireProfile("admin");
  const parsed = apartmentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    redirect(`/admin/apartments/new?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("apartments")
    .insert({ ...normalizeApartmentInput(parsed.data), org_id: profile.org_id })
    .select()
    .single();

  if (error || !data) {
    redirect(`/admin/apartments/new?error=${encodeURIComponent(error?.message ?? "Fehler beim Anlegen")}`);
  }

  revalidatePath("/admin/apartments");
  redirect(`/admin/apartments/${data.id}`);
}

export async function updateApartment(apartmentId: string, formData: FormData) {
  await requireProfile("admin");
  const parsed = apartmentSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    redirect(
      `/admin/apartments/${apartmentId}/edit?error=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("apartments")
    .update(normalizeApartmentInput(parsed.data))
    .eq("id", apartmentId);
  if (error) {
    redirect(`/admin/apartments/${apartmentId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/apartments");
  revalidatePath(`/admin/apartments/${apartmentId}`);
  redirect(`/admin/apartments/${apartmentId}`);
}

export async function setApartmentStatus(apartmentId: string, status: "active" | "archived") {
  await requireProfile("admin");
  const supabase = await createClient();
  await supabase.from("apartments").update({ status }).eq("id", apartmentId);
  revalidatePath("/admin/apartments");
  revalidatePath(`/admin/apartments/${apartmentId}`);
}

export async function addInventoryItem(apartmentId: string, formData: FormData) {
  await requireProfile("admin");
  const parsed = inventoryItemSchema.safeParse(formToObject(formData));
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("apartment_inventory_items").insert({ ...parsed.data, apartment_id: apartmentId });
  revalidatePath(`/admin/apartments/${apartmentId}`);
}

export async function removeInventoryItem(apartmentId: string, itemId: string) {
  await requireProfile("admin");
  const supabase = await createClient();
  await supabase.from("apartment_inventory_items").delete().eq("id", itemId);
  revalidatePath(`/admin/apartments/${apartmentId}`);
}

/** Belegungsstatus aus den Buchungen des heutigen Tages ableiten. */
async function refreshOccupancy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  apartmentId: string
) {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("apartment_bookings")
    .select("id")
    .eq("apartment_id", apartmentId)
    .lte("start_date", today)
    .gt("end_date", today)
    .limit(1);

  await supabase
    .from("apartments")
    .update({ occupancy_status: data && data.length > 0 ? "occupied" : "free" })
    .eq("id", apartmentId);
}

export async function addBooking(apartmentId: string, formData: FormData) {
  const profile = await requireProfile("admin");
  const parsed = bookingSchema.safeParse(formToObject(formData));
  if (!parsed.success) {
    redirect(
      `/admin/apartments/${apartmentId}?bookingError=${encodeURIComponent(parsed.error.issues[0].message)}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.from("apartment_bookings").insert({
    apartment_id: apartmentId,
    org_id: profile.org_id,
    uid: `manual-${crypto.randomUUID()}`,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    summary: parsed.data.summary || null,
    source: "manual",
  });
  if (error) {
    redirect(`/admin/apartments/${apartmentId}?bookingError=${encodeURIComponent(error.message)}`);
  }

  await refreshOccupancy(supabase, apartmentId);
  revalidatePath(`/admin/apartments/${apartmentId}`);
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
  redirect(`/admin/apartments/${apartmentId}?bookingCreated=1`);
}

export async function deleteBooking(apartmentId: string, bookingId: string) {
  await requireProfile("admin");
  const supabase = await createClient();
  await supabase.from("apartment_bookings").delete().eq("id", bookingId);
  await refreshOccupancy(supabase, apartmentId);
  revalidatePath(`/admin/apartments/${apartmentId}`);
  revalidatePath("/admin/calendar");
  revalidatePath("/admin");
}

export async function syncApartmentIcal(apartmentId: string) {
  await requireProfile("admin");
  const supabase = await createClient();
  const { data: apartment } = await supabase
    .from("apartments")
    .select("id, org_id, ical_url")
    .eq("id", apartmentId)
    .single();

  if (!apartment?.ical_url) {
    redirect(`/admin/apartments/${apartmentId}?icalError=${encodeURIComponent("Keine iCal-URL hinterlegt.")}`);
  }

  try {
    await syncApartmentBookings(supabase, apartment);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Synchronisierung fehlgeschlagen.";
    redirect(`/admin/apartments/${apartmentId}?icalError=${encodeURIComponent(message)}`);
  }

  revalidatePath(`/admin/apartments/${apartmentId}`);
  revalidatePath("/admin/calendar");
  redirect(`/admin/apartments/${apartmentId}?icalSynced=1`);
}

export async function toggleApartmentTemplate(
  apartmentId: string,
  templateId: string,
  assign: boolean
) {
  await requireProfile("admin");
  const supabase = await createClient();
  if (assign) {
    await supabase
      .from("apartment_checklist_templates")
      .insert({ apartment_id: apartmentId, template_id: templateId });
  } else {
    await supabase
      .from("apartment_checklist_templates")
      .delete()
      .eq("apartment_id", apartmentId)
      .eq("template_id", templateId);
  }
  revalidatePath(`/admin/apartments/${apartmentId}`);
}
