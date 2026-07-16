import { NextResponse } from "next/server";
import { addDays, format } from "date-fns";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToSubscriptions } from "@/lib/push/send";
import { sendEmail } from "@/lib/email/send";

/**
 * Sends a "Reinigung steht an" reminder to cleaners for jobs scheduled
 * tomorrow. Intended to be triggered once daily by an external scheduler
 * (Vercel Cron — see vercel.json) since this app has no cron runtime of its
 * own. Idempotent: skips jobs that already have a cleaning_reminder
 * notification, so re-running the same day is safe.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");

  const { data: jobs } = await admin
    .from("cleaning_jobs")
    .select("id, org_id, assigned_to, apartments(name)")
    .eq("scheduled_date", tomorrow)
    .eq("status", "scheduled")
    .not("assigned_to", "is", null);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ remindersSent: 0 });
  }

  const { data: alreadyNotified } = await admin
    .from("notifications")
    .select("related_job_id")
    .eq("type", "cleaning_reminder")
    .in(
      "related_job_id",
      jobs.map((j) => j.id)
    );
  const alreadyNotifiedIds = new Set((alreadyNotified ?? []).map((n) => n.related_job_id));

  const pending = jobs.filter((j) => !alreadyNotifiedIds.has(j.id));
  let sent = 0;

  for (const job of pending) {
    const apartmentName = (job.apartments as unknown as { name: string } | null)?.name ?? "Wohnung";
    const title = `Erinnerung: Reinigung morgen – ${apartmentName}`;

    const { error } = await admin.from("notifications").insert({
      org_id: job.org_id,
      user_id: job.assigned_to,
      type: "cleaning_reminder",
      title,
      body: null,
      related_job_id: job.id,
      related_apartment_id: null,
    });
    if (error) continue;
    sent += 1;

    const { data: cleaner } = await admin
      .from("profiles")
      .select("email")
      .eq("id", job.assigned_to)
      .single();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("profile_id", job.assigned_to);

    await Promise.all([
      sendPushToSubscriptions(subs ?? [], { title, url: "/clean" }),
      cleaner ? sendEmail(cleaner.email, title, `<p>${title}</p>`) : Promise.resolve(),
    ]);
  }

  return NextResponse.json({ remindersSent: sent });
}
