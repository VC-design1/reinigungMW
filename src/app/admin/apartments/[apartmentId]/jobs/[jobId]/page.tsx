import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CLEANING_JOB_STATUS_LABELS,
  ISSUE_CATEGORY_LABELS,
  type CleaningJobStatus,
} from "@/lib/types";
import { RatingForm } from "./rating-form";
import { StarRatingDisplay } from "@/components/star-rating-display";
import { rateCleaningJob } from "./actions";

export default async function AdminJobHistoryPage({
  params,
}: {
  params: Promise<{ apartmentId: string; jobId: string }>;
}) {
  const { apartmentId, jobId } = await params;
  await requireProfile("admin");
  const supabase = await createClient();

  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select("*, apartments(name, address), profiles!cleaning_jobs_assigned_to_fkey(full_name)")
    .eq("id", jobId)
    .single();
  if (!job) notFound();

  const [{ data: results }, { data: photos }, { data: issues }] = await Promise.all([
    supabase
      .from("cleaning_job_checklist_results")
      .select("*")
      .eq("cleaning_job_id", jobId)
      .order("room_name"),
    supabase.from("photos").select("*").eq("cleaning_job_id", jobId),
    supabase.from("issue_reports").select("*").eq("cleaning_job_id", jobId),
  ]);

  const photoUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage.from("cleaning-photos").createSignedUrl(p.storage_path, 3600);
      return { ...p, url: data?.signedUrl ?? null };
    })
  );

  const apartment = Array.isArray(job.apartments) ? job.apartments[0] : job.apartments;
  const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;

  const byRoom = new Map<string, typeof results>();
  for (const r of results ?? []) {
    if (!byRoom.has(r.room_name)) byRoom.set(r.room_name, []);
    byRoom.get(r.room_name)!.push(r);
  }

  const { data: rating } = await supabase
    .from("cleaning_ratings")
    .select("*")
    .eq("cleaning_job_id", jobId)
    .maybeSingle();

  const { data: previousJob } = await supabase
    .from("cleaning_jobs")
    .select("id, scheduled_date")
    .eq("apartment_id", apartmentId)
    .eq("status", "completed")
    .lt("scheduled_date", job.scheduled_date)
    .order("scheduled_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  let comparisonRooms: { room: string; beforeUrl: string | null; previousAfterUrl: string | null }[] = [];
  if (previousJob) {
    const { data: previousPhotos } = await supabase
      .from("photos")
      .select("room_name, phase, storage_path, created_at")
      .eq("cleaning_job_id", previousJob.id)
      .eq("phase", "after")
      .order("created_at", { ascending: false });

    const currentBeforePhotos = (photos ?? []).filter((p) => p.phase === "before");
    const rooms = new Set([
      ...currentBeforePhotos.map((p) => p.room_name),
      ...(previousPhotos ?? []).map((p) => p.room_name),
    ]);

    comparisonRooms = await Promise.all(
      [...rooms].map(async (room) => {
        const before = currentBeforePhotos.find((p) => p.room_name === room);
        const previousAfter = (previousPhotos ?? []).find((p) => p.room_name === room);
        const [beforeUrl, previousAfterUrl] = await Promise.all([
          before
            ? supabase.storage.from("cleaning-photos").createSignedUrl(before.storage_path, 3600)
            : Promise.resolve({ data: null }),
          previousAfter
            ? supabase.storage.from("cleaning-photos").createSignedUrl(previousAfter.storage_path, 3600)
            : Promise.resolve({ data: null }),
        ]);
        return {
          room,
          beforeUrl: beforeUrl.data?.signedUrl ?? null,
          previousAfterUrl: previousAfterUrl.data?.signedUrl ?? null,
        };
      })
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={`/admin/apartments/${apartmentId}`}
        className="flex items-center gap-1 text-sm text-slate-500"
      >
        <ArrowLeft className="h-4 w-4" /> Zurück zur Wohnung
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">
            {apartment?.name} — {format(parseISO(job.scheduled_date), "d. MMMM yyyy", { locale: de })}
          </h1>
          <p className="text-sm text-slate-500">Reinigungskraft: {cleaner?.full_name ?? "—"}</p>
        </div>
        <Badge>{CLEANING_JOB_STATUS_LABELS[job.status as CleaningJobStatus]}</Badge>
      </div>

      {job.status === "completed" && (
        <Card>
          <CardHeader>
            <CardTitle>Bewertung</CardTitle>
          </CardHeader>
          <CardContent>
            {rating ? (
              <div className="flex items-center gap-3">
                <StarRatingDisplay rating={rating.rating} />
                {rating.comment && <p className="text-sm text-slate-500">{rating.comment}</p>}
              </div>
            ) : (
              <RatingForm action={rateCleaningJob.bind(null, apartmentId, jobId, job.assigned_to)} />
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Checklisten-Ergebnis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {[...byRoom.entries()].map(([room, items]) => (
            <div key={room}>
              <p className="mb-1 text-sm font-semibold text-slate-700">{room}</p>
              <ul className="flex flex-col gap-1">
                {items!.map((item) => (
                  <li key={item.id} className="text-sm">
                    <span className={item.checked ? "text-slate-700" : "text-red-600"}>
                      {item.checked ? "✓" : "✗"} {item.label}
                    </span>
                    {item.note && <span className="text-slate-400"> — {item.note}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {(results ?? []).length === 0 && <p className="text-sm text-slate-400">Keine Checkliste vorhanden.</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Fotos</CardTitle>
        </CardHeader>
        <CardContent>
          {photoUrls.length === 0 ? (
            <p className="text-sm text-slate-400">Keine Fotos vorhanden.</p>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {photoUrls.map((p) => (
                <div key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                  {p.url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.url} alt={p.phase} className="h-full w-full object-cover" />
                  )}
                  <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                    {p.room_name} · {p.phase === "before" ? "Vorher" : p.phase === "after" ? "Nachher" : "Problem"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {comparisonRooms.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Vorher-Nachher-Vergleich</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-slate-400">
              Letzte Reinigung ({format(parseISO(previousJob!.scheduled_date), "d. MMMM yyyy", { locale: de })}
              , &quot;Nachher&quot;) vs. diese Reinigung (&quot;Vorher&quot;)
            </p>
            {comparisonRooms.map(({ room, beforeUrl, previousAfterUrl }) => (
              <div key={room}>
                <p className="mb-1 text-sm font-semibold text-slate-700">{room}</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                    {previousAfterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={previousAfterUrl} alt="Letzte Reinigung – Nachher" className="h-full w-full object-cover" />
                    ) : (
                      <p className="flex h-full items-center justify-center text-xs text-slate-400">Kein Foto</p>
                    )}
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                      Letzte Reinigung
                    </span>
                  </div>
                  <div className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                    {beforeUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={beforeUrl} alt="Diese Reinigung – Vorher" className="h-full w-full object-cover" />
                    ) : (
                      <p className="flex h-full items-center justify-center text-xs text-slate-400">Kein Foto</p>
                    )}
                    <span className="absolute bottom-0.5 left-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                      Diese Reinigung
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Gemeldete Probleme</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(issues ?? []).length === 0 ? (
            <p className="text-sm text-slate-400">Keine Meldungen.</p>
          ) : (
            (issues ?? []).map((issue) => (
              <div key={issue.id} className="rounded-md border border-slate-200 p-3">
                <div className="flex items-center gap-2">
                  <Badge variant={issue.priority === "critical" ? "red" : "default"}>
                    {ISSUE_CATEGORY_LABELS[issue.category as keyof typeof ISSUE_CATEGORY_LABELS]}
                  </Badge>
                  <Badge variant={issue.status === "resolved" ? "green" : "amber"}>{issue.status}</Badge>
                </div>
                <p className="mt-1 text-sm text-slate-700">{issue.description}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
