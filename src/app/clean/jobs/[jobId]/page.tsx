import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { JobDetailClient } from "./job-detail-client";
import { getDictionary, type Locale } from "@/lib/i18n/dictionaries";
import type {
  Apartment,
  CleaningJob,
  CleaningJobChecklistResult,
  IssueReport,
  Photo,
} from "@/lib/types";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select("*, apartments(*)")
    .eq("id", jobId)
    .single();

  if (!job) notFound();

  const apartment = job.apartments as unknown as Apartment;

  const [{ data: results }, { data: photos }, { data: issues }] = await Promise.all([
    supabase
      .from("cleaning_job_checklist_results")
      .select("*")
      .eq("cleaning_job_id", jobId)
      .order("room_name", { ascending: true }),
    supabase.from("photos").select("*").eq("cleaning_job_id", jobId),
    supabase
      .from("issue_reports")
      .select("*")
      .eq("cleaning_job_id", jobId)
      .order("created_at", { ascending: false }),
  ]);

  const photoUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("cleaning-photos")
        .createSignedUrl(p.storage_path, 3600);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  const locale = (profile.locale === "en" ? "en" : "de") as Locale;

  return (
    <JobDetailClient
      job={job as unknown as CleaningJob}
      apartment={apartment}
      initialResults={(results ?? []) as CleaningJobChecklistResult[]}
      initialPhotos={photoUrls as (Photo & { url: string | null })[]}
      initialIssues={(issues ?? []) as IssueReport[]}
      profileId={profile.id}
      dict={getDictionary(locale)}
    />
  );
}
