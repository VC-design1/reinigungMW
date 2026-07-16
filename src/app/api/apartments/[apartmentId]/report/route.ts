import { NextResponse } from "next/server";
import { format, subDays } from "date-fns";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { renderApartmentReportPdf, type ReportJob } from "@/lib/pdf/apartment-report";
import type { CleaningJobStatus, IssueCategory } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ apartmentId: string }> }
) {
  const { apartmentId } = await params;
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? format(subDays(new Date(), 90), "yyyy-MM-dd");
  const to = searchParams.get("to") ?? format(new Date(), "yyyy-MM-dd");

  const { data: apartment } = await supabase
    .from("apartments")
    .select("*")
    .eq("id", apartmentId)
    .eq("org_id", profile.org_id)
    .single();

  if (!apartment) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, scheduled_date, status, profiles!cleaning_jobs_assigned_to_fkey(full_name)")
    .eq("apartment_id", apartmentId)
    .gte("scheduled_date", from)
    .lte("scheduled_date", to)
    .order("scheduled_date", { ascending: false });

  const jobIds = (jobs ?? []).map((j) => j.id);

  const [{ data: results }, { data: issues }, { data: photos }] = await Promise.all([
    jobIds.length
      ? supabase
          .from("cleaning_job_checklist_results")
          .select("cleaning_job_id, room_name, label, checked, note")
          .in("cleaning_job_id", jobIds)
      : Promise.resolve({ data: [] }),
    jobIds.length
      ? supabase
          .from("issue_reports")
          .select("cleaning_job_id, category, description, priority")
          .in("cleaning_job_id", jobIds)
      : Promise.resolve({ data: [] }),
    jobIds.length
      ? supabase
          .from("photos")
          .select("cleaning_job_id, room_name, phase, storage_path")
          .in("cleaning_job_id", jobIds)
      : Promise.resolve({ data: [] }),
  ]);

  const photosWithUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("cleaning-photos")
        .createSignedUrl(p.storage_path, 300);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  const reportJobs: ReportJob[] = (jobs ?? []).map((job) => {
    const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
    return {
      id: job.id,
      scheduled_date: job.scheduled_date,
      status: job.status as CleaningJobStatus,
      cleanerName: cleaner?.full_name ?? null,
      results: (results ?? [])
        .filter((r) => r.cleaning_job_id === job.id)
        .map((r) => ({ room_name: r.room_name, label: r.label, checked: r.checked, note: r.note })),
      issues: (issues ?? [])
        .filter((i) => i.cleaning_job_id === job.id)
        .map((i) => ({
          category: i.category as IssueCategory,
          description: i.description,
          priority: i.priority,
        })),
      photos: photosWithUrls
        .filter((p) => p.cleaning_job_id === job.id)
        .map((p) => ({ url: p.url, room_name: p.room_name, phase: p.phase })),
    };
  });

  const buffer = await renderApartmentReportPdf({ apartment, jobs: reportJobs, from, to });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="zustandsbericht-${apartment.name.replace(/[^a-z0-9]+/gi, "-")}.pdf"`,
    },
  });
}
