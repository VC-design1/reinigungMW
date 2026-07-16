import ical from "node-ical";
import type { SupabaseClient } from "@supabase/supabase-js";

function toDateString(d: Date) {
  return d.toISOString().slice(0, 10);
}

/**
 * Pulls all events from an apartment's iCal feed (Airbnb/Booking export URL),
 * upserts them as apartment_bookings, and derives today's occupancy_status
 * from whether "now" falls inside any booking range.
 */
export async function syncApartmentBookings(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  apartment: { id: string; org_id: string; ical_url: string | null }
): Promise<{ synced: number }> {
  if (!apartment.ical_url) return { synced: 0 };

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

  if (bookings.length > 0) {
    const { error } = await supabase
      .from("apartment_bookings")
      .upsert(bookings, { onConflict: "apartment_id,uid" });
    if (error) throw error;
  }

  const today = toDateString(new Date());
  const occupiedToday = bookings.some((b) => b.start_date <= today && today < b.end_date);

  await supabase
    .from("apartments")
    .update({ occupancy_status: occupiedToday ? "occupied" : "free" })
    .eq("id", apartment.id);

  return { synced: bookings.length };
}
