import { subDays, format } from "date-fns";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { UtilizationChart, DurationChart, DamageRateChart, type BarDatum } from "./stats-charts";

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-2xl font-semibold tabular-nums text-slate-900">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </CardContent>
    </Card>
  );
}

export default async function StatsPage() {
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const from = format(subDays(new Date(), 90), "yyyy-MM-dd");

  const [{ data: completedJobs }, { data: allJobs }, { data: issues }] = await Promise.all([
    supabase
      .from("cleaning_jobs")
      .select("id, assigned_to, started_at, completed_at, profiles!cleaning_jobs_assigned_to_fkey(full_name)")
      .eq("org_id", profile.org_id)
      .eq("status", "completed")
      .gte("scheduled_date", from),
    supabase
      .from("cleaning_jobs")
      .select("id, apartment_id, apartments(name)")
      .eq("org_id", profile.org_id)
      .gte("scheduled_date", from),
    supabase
      .from("issue_reports")
      .select("id, apartment_id")
      .eq("org_id", profile.org_id)
      .gte("created_at", from),
  ]);

  const jobs = completedJobs ?? [];

  // Ø Reinigungsdauer
  const durations = jobs
    .filter((j) => j.started_at && j.completed_at)
    .map((j) => (new Date(j.completed_at!).getTime() - new Date(j.started_at!).getTime()) / 60000);
  const avgDurationOverall = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const byCleaner = new Map<string, { name: string; count: number; durations: number[] }>();
  for (const job of jobs) {
    if (!job.assigned_to) continue;
    const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
    const name = cleaner?.full_name ?? "—";
    if (!byCleaner.has(job.assigned_to)) byCleaner.set(job.assigned_to, { name, count: 0, durations: [] });
    const entry = byCleaner.get(job.assigned_to)!;
    entry.count += 1;
    if (job.started_at && job.completed_at) {
      entry.durations.push((new Date(job.completed_at).getTime() - new Date(job.started_at).getTime()) / 60000);
    }
  }

  const utilizationData: BarDatum[] = [...byCleaner.values()]
    .map((c) => ({ label: c.name, value: c.count }))
    .sort((a, b) => b.value - a.value);

  const durationData: BarDatum[] = [...byCleaner.values()]
    .filter((c) => c.durations.length > 0)
    .map((c) => ({
      label: c.name,
      value: Math.round(c.durations.reduce((a, b) => a + b, 0) / c.durations.length),
    }))
    .sort((a, b) => b.value - a.value);

  // Schadensquote pro Wohnung
  const jobCountByApartment = new Map<string, { name: string; jobs: number; issues: number }>();
  for (const job of allJobs ?? []) {
    const apartment = Array.isArray(job.apartments) ? job.apartments[0] : job.apartments;
    const name = apartment?.name ?? "—";
    if (!jobCountByApartment.has(job.apartment_id)) {
      jobCountByApartment.set(job.apartment_id, { name, jobs: 0, issues: 0 });
    }
    jobCountByApartment.get(job.apartment_id)!.jobs += 1;
  }
  for (const issue of issues ?? []) {
    const entry = jobCountByApartment.get(issue.apartment_id);
    if (entry) entry.issues += 1;
  }

  const damageRateData: BarDatum[] = [...jobCountByApartment.values()]
    .filter((a) => a.jobs > 0)
    .map((a) => ({ label: a.name, value: Math.round((a.issues / a.jobs) * 100) }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Statistik</h1>
        <p className="text-sm text-slate-500">Letzte 90 Tage</p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="Abgeschlossene Reinigungen" value={String(jobs.length)} />
        <StatTile
          label="Ø Reinigungsdauer"
          value={avgDurationOverall !== null ? `${avgDurationOverall} Min.` : "—"}
        />
        <StatTile label="Aktive Reinigungskräfte" value={String(byCleaner.size)} />
        <StatTile label="Gemeldete Probleme" value={String((issues ?? []).length)} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <UtilizationChart data={utilizationData} />
        <DurationChart data={durationData} />
      </div>

      <DamageRateChart data={damageRateData} />
    </div>
  );
}
