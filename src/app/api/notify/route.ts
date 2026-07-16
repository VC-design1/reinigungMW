import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToSubscriptions } from "@/lib/push/send";
import { sendEmail } from "@/lib/email/send";

const bodySchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cleaning_completed"), jobId: z.string().uuid() }),
  z.object({ type: z.literal("issue_reported"), issueId: z.string().uuid() }),
]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (parsed.data.type === "cleaning_completed") {
    const { data: job } = await admin
      .from("cleaning_jobs")
      .select("id, org_id, apartment_id, apartments(name)")
      .eq("id", parsed.data.jobId)
      .single();
    if (!job) return NextResponse.json({ error: "not found" }, { status: 404 });

    const apartmentName = (job.apartments as unknown as { name: string } | null)?.name ?? "Wohnung";
    await notifyAdmins(
      admin,
      job.org_id,
      {
        type: "cleaning_completed",
        title: `Reinigung abgeschlossen: ${apartmentName}`,
        body: null,
        related_job_id: job.id,
        related_apartment_id: job.apartment_id,
      },
      // one-off, low-volume event — always push immediately
      true
    );
  }

  if (parsed.data.type === "issue_reported") {
    const { data: issue } = await admin
      .from("issue_reports")
      .select("id, cleaning_job_id, apartment_id, org_id, category, priority, apartments(name)")
      .eq("id", parsed.data.issueId)
      .single();
    if (!issue) return NextResponse.json({ error: "not found" }, { status: 404 });

    const apartmentName = (issue.apartments as unknown as { name: string } | null)?.name ?? "Wohnung";
    const urgent = issue.priority === "critical";
    await notifyAdmins(
      admin,
      issue.org_id,
      {
        type: "issue_reported",
        title: `${urgent ? "Dringend: " : ""}Problem gemeldet – ${apartmentName}`,
        body: null,
        related_job_id: issue.cleaning_job_id,
        related_apartment_id: issue.apartment_id,
      },
      // kritisch => sofortige Push/E-Mail; normal => nur in-app, gesammelt
      // sichtbar im Dashboard unter "Offene Meldungen"
      urgent
    );
  }

  return NextResponse.json({ ok: true });
}

async function notifyAdmins(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string,
  fields: {
    type: "cleaning_completed" | "issue_reported" | "cleaning_overdue" | "cleaning_reminder";
    title: string;
    body: string | null;
    related_job_id: string | null;
    related_apartment_id: string | null;
  },
  pushImmediately: boolean
) {
  const { data: admins } = await admin
    .from("profiles")
    .select("id, email")
    .eq("org_id", orgId)
    .eq("role", "admin")
    .eq("active", true);

  if (!admins || admins.length === 0) return;

  await admin.from("notifications").insert(
    admins.map((a) => ({
      org_id: orgId,
      user_id: a.id,
      ...fields,
    }))
  );

  if (!pushImmediately) return;

  const adminIds = admins.map((a) => a.id);
  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth")
    .in("profile_id", adminIds);

  await Promise.all([
    sendPushToSubscriptions(subs ?? [], { title: fields.title, body: fields.body ?? undefined, url: "/admin/notifications" }),
    ...admins.map((a) =>
      sendEmail(a.email, fields.title, `<p>${fields.title}</p><p><a href="${process.env.NEXT_PUBLIC_APP_URL ?? ""}/admin/notifications">In der App ansehen</a></p>`)
    ),
  ]);
}
