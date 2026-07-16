import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToSubscriptions } from "@/lib/push/send";
import { sendEmail } from "@/lib/email/send";

export interface BookingForAutoClean {
  id: string;
  apartment_id: string;
  org_id: string;
  end_date: string;
}

/**
 * Legt für eine Buchung automatisch den Abreise-Reinigungsauftrag an:
 * geplant am Abreisetag, zugewiesen an die Stamm-Reinigungskraft der Wohnung
 * (falls gesetzt), mit Checklisten-Snapshot der ersten zugeordneten Vorlage.
 * Die zugewiesene Reinigungskraft wird in-app + Push/E-Mail informiert.
 *
 * Dedupliziert über cleaning_jobs.booking_id (unique) — pro Buchung entsteht
 * höchstens ein Auftrag, auch wenn der iCal-Sync mehrfach läuft. Läuft mit dem
 * Service-Role-Client, weil Benachrichtigungen und Checklisten-Snapshots keine
 * RLS-Insert-Policies für Vermieter haben; die Berechtigung (eigene Wohnung /
 * Admin) ist zu diesem Zeitpunkt bereits durch die aufrufende Action geprüft.
 */
export async function ensureCleaningJobForBooking(
  booking: BookingForAutoClean,
  createdBy: string
): Promise<{ created: boolean }> {
  const today = new Date().toISOString().slice(0, 10);
  if (booking.end_date < today) return { created: false }; // vergangene Buchung (iCal-Import)

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("cleaning_jobs")
    .select("id")
    .eq("booking_id", booking.id)
    .maybeSingle();
  if (existing) return { created: false };

  const [{ data: apartment }, { data: templateLink }] = await Promise.all([
    admin
      .from("apartments")
      .select("id, name, default_cleaner_id")
      .eq("id", booking.apartment_id)
      .single(),
    admin
      .from("apartment_checklist_templates")
      .select("template_id")
      .eq("apartment_id", booking.apartment_id)
      .limit(1)
      .maybeSingle(),
  ]);
  if (!apartment) return { created: false };

  const assignedTo = apartment.default_cleaner_id ?? null;
  const templateId = templateLink?.template_id ?? null;

  const { data: job, error } = await admin
    .from("cleaning_jobs")
    .insert({
      org_id: booking.org_id,
      apartment_id: booking.apartment_id,
      assigned_to: assignedTo,
      checklist_template_id: templateId,
      scheduled_date: booking.end_date,
      booking_id: booking.id,
      created_by: createdBy,
    })
    .select()
    .single();
  if (error || !job) return { created: false };

  if (templateId) {
    const { data: items } = await admin
      .from("checklist_template_items")
      .select("room_name, label")
      .eq("template_id", templateId);
    if (items && items.length > 0) {
      await admin.from("cleaning_job_checklist_results").insert(
        items.map((item) => ({
          cleaning_job_id: job.id,
          org_id: booking.org_id,
          room_name: item.room_name,
          label: item.label,
        }))
      );
    }
  }

  if (assignedTo) {
    const dateLabel = booking.end_date.split("-").reverse().join(".");
    const title = `Neue Reinigung geplant: ${apartment.name} am ${dateLabel}`;

    await admin.from("notifications").insert({
      org_id: booking.org_id,
      user_id: assignedTo,
      type: "cleaning_reminder",
      title,
      body: "Automatisch geplant zum Ende des Vermietungszeitraums.",
      related_job_id: job.id,
      related_apartment_id: booking.apartment_id,
    });

    const [{ data: cleaner }, { data: subs }] = await Promise.all([
      admin.from("profiles").select("email").eq("id", assignedTo).single(),
      admin.from("push_subscriptions").select("endpoint, p256dh, auth").eq("profile_id", assignedTo),
    ]);
    await Promise.all([
      sendPushToSubscriptions(subs ?? [], { title, url: "/clean" }),
      cleaner ? sendEmail(cleaner.email, title, `<p>${title}</p>`) : Promise.resolve(),
    ]);
  }

  return { created: true };
}
