import Link from "next/link";
import { format, isPast, isToday, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CLEANING_JOB_STATUS_LABELS, ISSUE_CATEGORY_LABELS, type CleaningJobStatus, type IssueCategory } from "@/lib/types";

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

export default async function AdminDashboardPage() {
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const today = format(new Date(), "yyyy-MM-dd");

  const [{ data: apartments }, { data: jobs }, { data: openIssues }] = await Promise.all([
    supabase
      .from("apartments")
      .select("*")
      .eq("org_id", profile.org_id)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("cleaning_jobs")
      .select("id, apartment_id, scheduled_date, status, apartments(name), profiles!cleaning_jobs_assigned_to_fkey(full_name)")
      .eq("org_id", profile.org_id)
      .neq("status", "completed")
      .lte("scheduled_date", today)
      .order("scheduled_date", { ascending: true }),
    supabase
      .from("issue_reports")
      .select("id, apartment_id, category, priority, description, apartments(name)")
      .eq("org_id", profile.org_id)
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const overdue = (jobs ?? []).filter((j) => isPast(parseISO(j.scheduled_date)) && !isToday(parseISO(j.scheduled_date)));
  const todayJobs = (jobs ?? []).filter((j) => isToday(parseISO(j.scheduled_date)));

  const jobByApartment = new Map<string, (typeof jobs extends (infer T)[] | null ? T : never)>();
  for (const j of jobs ?? []) {
    if (isToday(parseISO(j.scheduled_date)) || !jobByApartment.has(j.apartment_id)) {
      jobByApartment.set(j.apartment_id, j);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Dashboard</h1>

      {overdue.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-red-600">Überfällige Reinigungen</h2>
          <div className="flex flex-col gap-2">
            {overdue.map((job) => {
              const apartment = Array.isArray(job.apartments) ? job.apartments[0] : job.apartments;
              const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
              return (
                <Link key={job.id} href={`/admin/apartments/${job.apartment_id}`}>
                  <Card className="border-red-200">
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">{apartment?.name}</p>
                        <p className="text-xs text-slate-400">
                          Geplant für {format(parseISO(job.scheduled_date), "d. MMMM", { locale: de })} ·{" "}
                          {cleaner?.full_name ?? "Nicht zugewiesen"}
                        </p>
                      </div>
                      <Badge variant="red">Überfällig</Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {(openIssues ?? []).length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-slate-700">
            Offene Meldungen{" "}
            <span className="font-normal text-slate-400">
              (kritische werden sofort per Push/E-Mail gemeldet, normale hier gesammelt)
            </span>
          </h2>
          <div className="flex flex-col gap-2">
            {[...(openIssues ?? [])]
              .sort((a, b) => (a.priority === b.priority ? 0 : a.priority === "critical" ? -1 : 1))
              .map((issue) => {
                const apartment = Array.isArray(issue.apartments) ? issue.apartments[0] : issue.apartments;
                return (
                  <Link key={issue.id} href={`/admin/apartments/${issue.apartment_id}`}>
                    <Card>
                      <CardContent className="flex items-center justify-between p-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{apartment?.name}</p>
                            <Badge>{ISSUE_CATEGORY_LABELS[issue.category as IssueCategory]}</Badge>
                          </div>
                          <p className="text-xs text-slate-400">{issue.description}</p>
                        </div>
                        <Badge variant={issue.priority === "critical" ? "red" : "default"}>
                          {issue.priority === "critical" ? "Kritisch" : "Normal"}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Heute geplant</h2>
        {todayJobs.length === 0 ? (
          <p className="text-sm text-slate-400">Keine Reinigungen für heute geplant.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {todayJobs.map((job) => {
              const apartment = Array.isArray(job.apartments) ? job.apartments[0] : job.apartments;
              const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
              return (
                <Link key={job.id} href={`/admin/apartments/${job.apartment_id}`}>
                  <Card>
                    <CardContent className="flex items-center justify-between p-3">
                      <div>
                        <p className="text-sm font-medium">{apartment?.name}</p>
                        <p className="text-xs text-slate-400">{cleaner?.full_name ?? "Nicht zugewiesen"}</p>
                      </div>
                      <Badge variant={statusVariant(job.status as CleaningJobStatus)}>
                        {CLEANING_JOB_STATUS_LABELS[job.status as CleaningJobStatus]}
                      </Badge>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">Alle Wohnungen</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(apartments ?? []).map((apt) => {
            const job = jobByApartment.get(apt.id);
            return (
              <Link key={apt.id} href={`/admin/apartments/${apt.id}`}>
                <Card className="h-full transition hover:border-slate-300">
                  <CardContent className="flex flex-col gap-2 p-4">
                    <p className="font-medium text-slate-900">{apt.name}</p>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={apt.occupancy_status === "free" ? "green" : "amber"}>
                        {apt.occupancy_status === "free" ? "Frei" : "Belegt"}
                      </Badge>
                      {job ? (
                        <Badge variant={statusVariant(job.status as CleaningJobStatus)}>
                          {CLEANING_JOB_STATUS_LABELS[job.status as CleaningJobStatus]}
                        </Badge>
                      ) : (
                        <Badge>Kein offener Auftrag</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
