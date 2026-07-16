import ical from "node-ical";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureCleaningJobForBooking } from "@/lib/bookings/auto-clean";

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Pulls all events from an apartment's iCal feed (Airbnb/Booking export URL),
 * upserts them as apartment_bookings, derives today's occupancy_status, and
 * schedules the automatic departure-day cleaning job for every (future)
 * booking that doesn't have one yet.
 */
export async function syncApartmentBookings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  apartment: { id: string; org_id: string; ical_url: string | null },
  createdBy: string
): Promise<{ synced: number; jobsCreated: number }> {
  if (!apartment.ical_url) return { synced: 0, jobsCreated: 0 };

  const events = await ical.async.fromURL(apartment.ical_url);

  const bookings = Object.values(events)
    .filter((e): e is ical.CalendarComponent => Boolean(e) && e!.type === "VEVENT")
    .map((e) => e as ical.VEvent)
    .filter((e) => e.start instanceof Date)
    .map((e) => ({
      apartment_id: apartment.id,
      org_id: apartment.org_id,
      uid: e.uid,
      start_date: toDateString(e.start),
      end_date: toDateString(e.end instanceof Date ? e.end : e.start),
      summary: typeof e.summary === "string" ? e.summary : null,
      source: "ical",
    }));

  let jobsCreated = 0;
  if (bookings.length > 0) {
    const { data: upserted, error } = await supabase
      .from("apartment_bookings")
      .upsert(bookings, { onConflict: "apartment_id,uid" })
      .select("id, apartment_id, org_id, end_date");
    if (error) throw error;

    for (const booking of upserted ?? []) {
      const { created } = await ensureCleaningJobForBooking(booking, createdBy);
      if (created) jobsCreated += 1;
    }
  }

  const today = toDateString(new Date());
  const occupiedToday = bookings.some((b) => b.start_date <= today && today < b.end_date);

  await supabase
    .from("apartments")
    .update({ occupancy_status: occupiedToday ? "occupied" : "free" })
    .eq("id", apartment.id);

  return { synced: bookings.length, jobsCreated };
}
