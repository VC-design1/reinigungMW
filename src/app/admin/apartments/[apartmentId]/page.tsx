import Link from "next/link";
import { notFound } from "next/navigation";
import { format, parseISO } from "date-fns";
import { de } from "date-fns/locale";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  addBooking,
  addInventoryItem,
  deleteBooking,
  removeInventoryItem,
  setApartmentStatus,
  syncApartmentIcal,
  toggleApartmentTemplate,
} from "../actions";
import { CLEANING_JOB_STATUS_LABELS, type CleaningJobStatus } from "@/lib/types";
import { ApartmentQrCode } from "./apartment-qr-code";

export default async function ApartmentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ apartmentId: string }>;
  searchParams: Promise<{
    icalError?: string;
    icalSynced?: string;
    bookingError?: string;
    bookingCreated?: string;
  }>;
}) {
  const { apartmentId } = await params;
  const { icalError, icalSynced, bookingError, bookingCreated } = await searchParams;
  const profile = await requireProfile(["admin", "landlord"]);
  const supabase = await createClient();

  const [
    { data: apartment },
    { data: inventory },
    { data: templates },
    { data: assigned },
    { data: jobs },
    { data: bookings },
  ] = await Promise.all([
    supabase.from("apartments").select("*").eq("id", apartmentId).single(),
    supabase.from("apartment_inventory_items").select("*").eq("apartment_id", apartmentId),
    supabase.from("checklist_templates").select("*").eq("org_id", profile.org_id),
    supabase.from("apartment_checklist_templates").select("template_id").eq("apartment_id", apartmentId),
    supabase
      .from("cleaning_jobs")
      .select("id, scheduled_date, status, profiles!cleaning_jobs_assigned_to_fkey(full_name)")
      .eq("apartment_id", apartmentId)
      .order("scheduled_date", { ascending: false })
      .limit(30),
    supabase
      .from("apartment_bookings")
      .select("*")
      .eq("apartment_id", apartmentId)
      .gte("end_date", format(new Date(), "yyyy-MM-dd"))
      .order("start_date", { ascending: true })
      .limit(10),
  ]);

  if (!apartment) notFound();

  // Admins verwalten alle Wohnungen, Vermieter ihre eigenen.
  const canEdit = profile.role === "admin" || apartment.owner_id === profile.id;
  const assignedIds = new Set((assigned ?? []).map((a) => a.template_id));

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

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-slate-900">{apartment.name}</h1>
          <p className="text-sm text-slate-500">{apartment.address}</p>
          <div className="mt-2 flex gap-2">
            <Badge variant={apartment.occupancy_status === "free" ? "green" : "amber"}>
              {apartment.occupancy_status === "free" ? "Frei" : "Belegt"}
            </Badge>
            <Badge>{apartment.room_count} Zimmer</Badge>
            {apartment.status === "archived" && <Badge>Archiviert</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`/api/apartments/${apartment.id}/report`} target="_blank" rel="noreferrer">
            <Button size="sm" variant="outline">
              PDF-Bericht
            </Button>
          </a>
          {canEdit && (
            <>
              <Link href={`/admin/apartments/${apartment.id}/edit`}>
                <Button size="sm" variant="outline">
                  Bearbeiten
                </Button>
              </Link>
              <form
                action={setApartmentStatus.bind(
                  null,
                  apartment.id,
                  apartment.status === "active" ? "archived" : "active"
                )}
              >
                <Button size="sm" variant={apartment.status === "active" ? "destructive" : "outline"}>
                  {apartment.status === "active" ? "Archivieren" : "Aktivieren"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ausstattung / Inventar</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ul className="flex flex-col gap-1">
              {(inventory ?? []).map((item) => (
                <li key={item.id} className="flex items-center justify-between text-sm">
                  <span>
                    {item.name}
                    {item.category && <span className="text-slate-400"> · {item.category}</span>}
                  </span>
                  {canEdit && (
                    <form action={removeInventoryItem.bind(null, apartment.id, item.id)}>
                      <Button size="sm" variant="ghost" type="submit">
                        Entfernen
                      </Button>
                    </form>
                  )}
                </li>
              ))}
              {(inventory ?? []).length === 0 && (
                <p className="text-sm text-slate-400">Noch keine Gegenstände erfasst.</p>
              )}
            </ul>
            {canEdit && (
              <form action={addInventoryItem.bind(null, apartment.id)} className="flex gap-2">
                <Input name="name" placeholder="Gegenstand" required className="flex-1" />
                <Input name="category" placeholder="Kategorie" className="w-32" />
                <Button type="submit" size="sm" variant="outline">
                  Hinzufügen
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Checklisten-Vorlagen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {(templates ?? []).map((tpl) => {
              const isAssigned = assignedIds.has(tpl.id);
              if (!canEdit) {
                return isAssigned ? (
                  <span key={tpl.id} className="text-sm">
                    {tpl.name}
                  </span>
                ) : null;
              }
              return (
                <form
                  key={tpl.id}
                  action={toggleApartmentTemplate.bind(null, apartment.id, tpl.id, !isAssigned)}
                  className="flex items-center justify-between"
                >
                  <span className="text-sm">{tpl.name}</span>
                  <Button type="submit" size="sm" variant={isAssigned ? "outline" : "default"}>
                    {isAssigned ? "Zuweisung entfernen" : "Zuweisen"}
                  </Button>
                </form>
              );
            })}
            {(templates ?? []).length === 0 && (
              <p className="text-sm text-slate-400">
                Noch keine Vorlagen vorhanden.{" "}
                {canEdit && (
                  <Link href="/admin/templates/new" className="underline">
                    Vorlage anlegen
                  </Link>
                )}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>QR-Code</CardTitle>
          </CardHeader>
          <CardContent>
            <ApartmentQrCode apartmentId={apartment.id} apartmentName={apartment.name} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Belegung &amp; Buchungen</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ul className="flex flex-col gap-1.5">
              {(bookings ?? []).map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-slate-700">
                    {format(parseISO(b.start_date), "d.MM.", { locale: de })} –{" "}
                    {format(parseISO(b.end_date), "d.MM.yyyy", { locale: de })}
                    {b.summary && <span className="text-slate-500"> · {b.summary}</span>}
                  </span>
                  <span className="flex items-center gap-1">
                    <Badge>{b.source === "manual" ? "Manuell" : "iCal"}</Badge>
                    <form action={deleteBooking.bind(null, apartment.id, b.id)}>
                      <Button size="sm" variant="ghost" type="submit">
                        Löschen
                      </Button>
                    </form>
                  </span>
                </li>
              ))}
              {(bookings ?? []).length === 0 && (
                <p className="text-sm text-slate-400">Keine anstehenden Belegungen.</p>
              )}
            </ul>

            <form
              action={addBooking.bind(null, apartment.id)}
              className="flex flex-col gap-2 border-t border-slate-100 pt-3"
            >
              <p className="text-xs font-medium text-slate-500">Buchung eintragen</p>
              <div className="flex gap-2">
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="start_date" className="text-xs text-slate-500">
                    Anreise
                  </label>
                  <Input id="start_date" name="start_date" type="date" required className="h-9 text-sm" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <label htmlFor="end_date" className="text-xs text-slate-500">
                    Abreise
                  </label>
                  <Input id="end_date" name="end_date" type="date" required className="h-9 text-sm" />
                </div>
              </div>
              <Input name="summary" placeholder="Gast/Notiz (optional)" className="h-9 text-sm" />
              {bookingError && <p className="text-sm text-red-600">{bookingError}</p>}
              {bookingCreated && <p className="text-sm text-emerald-600">Buchung eingetragen.</p>}
              <Button type="submit" size="sm" className="self-start">
                Buchung eintragen
              </Button>
            </form>

            {canEdit && (
            <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-500">Automatischer Import (iCal)</p>
              {apartment.ical_url ? (
                <form action={syncApartmentIcal.bind(null, apartment.id)}>
                  <Button type="submit" size="sm" variant="outline">
                    Jetzt synchronisieren
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-slate-500">
                  Keine iCal-URL hinterlegt.{" "}
                  <Link href={`/admin/apartments/${apartment.id}/edit`} className="underline">
                    Jetzt eintragen
                  </Link>
                </p>
              )}
              {icalSynced && <p className="text-sm text-emerald-600">Synchronisierung erfolgreich.</p>}
              {icalError && <p className="text-sm text-red-600">{icalError}</p>}
            </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historie der Reinigungen</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(jobs ?? []).map((job) => {
            const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
            return (
              <Link
                key={job.id}
                href={`/admin/apartments/${apartment.id}/jobs/${job.id}`}
                className="flex items-center justify-between rounded-md border border-slate-200 p-3 text-sm hover:border-slate-300"
              >
                <div>
                  <p>{format(parseISO(job.scheduled_date), "d. MMMM yyyy", { locale: de })}</p>
                  <p className="text-xs text-slate-400">{cleaner?.full_name ?? "Nicht zugewiesen"}</p>
                </div>
                <Badge variant={statusVariant(job.status as CleaningJobStatus)}>
                  {CLEANING_JOB_STATUS_LABELS[job.status as CleaningJobStatus]}
                </Badge>
              </Link>
            );
          })}
          {(jobs ?? []).length === 0 && (
            <p className="text-sm text-slate-400">Noch keine Reinigungen für diese Wohnung.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
