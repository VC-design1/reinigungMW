import Link from "next/link";
import { format, addDays, isToday, isPast, parseISO } from "date-fns";
import { de, enUS } from "date-fns/locale";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type CleaningJobStatus } from "@/lib/types";
import { getDictionary, type Locale } from "@/lib/i18n/dictionaries";

function statusVariant(status: CleaningJobStatus) {
  switch (status) {
    case "completed":
      return "green" as const;
    case "in_progress":
      return "blue" as const;
    case "problem_reported":
      return "red" as const;
    default:
      return "default" as const;
  }
}

export default async function CleanerJobOverview() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const locale = (profile.locale === "en" ? "en" : "de") as Locale;
  const dict = getDictionary(locale);
  const dateFnsLocale = locale === "en" ? enUS : de;

  const weekEnd = format(addDays(new Date(), 7), "yyyy-MM-dd");

  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("id, scheduled_date, scheduled_start, status, apartments(name, address)")
    .eq("assigned_to", profile.id)
    .lte("scheduled_date", weekEnd)
    .order("scheduled_date", { ascending: true });

  const list = jobs ?? [];
  const overdue = list.filter(
    (j) => j.status !== "completed" && isPast(parseISO(j.scheduled_date)) && !isToday(parseISO(j.scheduled_date))
  );
  const todayJobs = list.filter((j) => isToday(parseISO(j.scheduled_date)));
  const upcoming = list.filter(
    (j) => !isToday(parseISO(j.scheduled_date)) && !overdue.includes(j)
  );

  function JobCard({ job }: { job: (typeof list)[number] }) {
    const apartment = Array.isArray(job.apartments) ? job.apartments[0] : job.apartments;
    return (
      <Link href={`/clean/jobs/${job.id}`}>
        <Card className="mb-3 transition hover:border-slate-300">
          <CardContent className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium text-slate-900">{apartment?.name ?? "—"}</p>
              <p className="text-sm text-slate-500">{apartment?.address}</p>
              <p className="mt-1 text-xs text-slate-400">
                {format(parseISO(job.scheduled_date), "EEEE, d. MMMM", { locale: dateFnsLocale })}
                {job.scheduled_start ? ` · ${job.scheduled_start.slice(0, 5)}` : ""}
              </p>
            </div>
            <Badge variant={statusVariant(job.status as CleaningJobStatus)}>
              {dict.statusLabels[job.status as CleaningJobStatus]}
            </Badge>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{dict.overview.title}</h1>
        <p className="text-sm text-slate-500">{dict.overview.subtitle}</p>
      </div>

      {overdue.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-red-600">{dict.overview.overdue}</h2>
          {overdue.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{dict.overview.today}</h2>
        {todayJobs.length === 0 ? (
          <p className="text-sm text-slate-400">{dict.overview.todayEmpty}</p>
        ) : (
          todayJobs.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{dict.overview.thisWeek}</h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-slate-400">{dict.overview.thisWeekEmpty}</p>
        ) : (
          upcoming.map((job) => <JobCard key={job.id} job={job} />)
        )}
      </section>
    </div>
  );
}
