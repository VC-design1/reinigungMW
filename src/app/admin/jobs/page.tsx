import Link from "next/link";
import { format, parseISO, isPast, isToday } from "date-fns";
import { de } from "date-fns/locale";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cancelJob } from "./actions";
import { CLEANING_JOB_STATUS_LABELS, type CleaningJobStatus } from "@/lib/types";

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

export default async function JobsPage() {
  const profile = await requireProfile(["admin", "landlord"]);
  const supabase = await createClient();

  const { data: jobs } = await supabase
    .from("cleaning_jobs")
    .select("*, apartments(name), profiles!cleaning_jobs_assigned_to_fkey(full_name)")
    .eq("org_id", profile.org_id)
    .order("scheduled_date", { ascending: true })
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Reinigungsaufträge</h1>
        <Link href="/admin/jobs/new">
          <Button size="sm">Neuer Auftrag</Button>
        </Link>
      </div>

      <div className="flex flex-col gap-2">
        {(jobs ?? []).map((job) => {
          const apartment = Array.isArray(job.apartments) ? job.apartments[0] : job.apartments;
          const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
          const overdue =
            job.status !== "completed" &&
            isPast(parseISO(job.scheduled_date)) &&
            !isToday(parseISO(job.scheduled_date));
          return (
            <Card key={job.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <p className="font-medium text-slate-900">{apartment?.name ?? "Wohnung"}</p>
                  <p className="text-sm text-slate-500">
                    {format(parseISO(job.scheduled_date), "d. MMMM yyyy", { locale: de })}
                    {job.scheduled_start ? ` · ${job.scheduled_start.slice(0, 5)} Uhr` : ""} ·{" "}
                    {cleaner?.full_name ?? "Nicht zugewiesen"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {overdue && <Badge variant="red">Überfällig</Badge>}
                  <Badge variant={statusVariant(job.status as CleaningJobStatus)}>
                    {CLEANING_JOB_STATUS_LABELS[job.status as CleaningJobStatus]}
                  </Badge>
                  {job.status === "scheduled" && (
                    <form action={cancelJob.bind(null, job.id)}>
                      <Button type="submit" size="sm" variant="ghost">
                        Löschen
                      </Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
        {(jobs ?? []).length === 0 && <p className="text-sm text-slate-400">Noch keine Aufträge angelegt.</p>}
      </div>
    </div>
  );
}
