import Link from "next/link";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { de } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

// Feste Farbzuordnung pro Wohnung (nach Namens-Sortierung), damit dieselbe
// Wohnung überall dieselbe Farbe trägt. Validierte kategoriale Palette.
const APARTMENT_COLORS = [
  "#2a78d6", // blau
  "#008300", // grün
  "#e87ba4", // magenta
  "#eda100", // gelb
  "#1baf7a", // aqua
  "#eb6834", // orange
  "#4a3aa7", // violett
  "#e34948", // rot
];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string; from?: string; to?: string }>;
}) {
  const { month: monthParam, day: dayParam, from: fromParam, to: toParam } = await searchParams;
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const anchor = monthParam ? parseISO(`${monthParam}-01`) : new Date();
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const rangeStart = format(gridStart, "yyyy-MM-dd");
  const rangeEnd = format(gridEnd, "yyyy-MM-dd");
  const selectedDay = dayParam ?? format(new Date(), "yyyy-MM-dd");

  const [{ data: jobs }, { data: bookings }, { data: cleaners }, { data: apartments }] =
    await Promise.all([
      supabase
        .from("cleaning_jobs")
        .select(
          "id, apartment_id, assigned_to, scheduled_date, status, apartments(name), profiles!cleaning_jobs_assigned_to_fkey(full_name)"
        )
        .eq("org_id", profile.org_id)
        .gte("scheduled_date", rangeStart)
        .lte("scheduled_date", rangeEnd),
      supabase
        .from("apartment_bookings")
        .select("*, apartments(name)")
        .eq("org_id", profile.org_id)
        .lte("start_date", rangeEnd)
        .gte("end_date", rangeStart),
      supabase
        .from("profiles")
        .select("id, full_name")
        .eq("org_id", profile.org_id)
        .eq("role", "cleaner")
        .eq("active", true)
        .order("full_name"),
      supabase
        .from("apartments")
        .select("id, name")
        .eq("org_id", profile.org_id)
        .eq("status", "active")
        .order("name"),
    ]);

  const colorByApartment = new Map<string, string>(
    (apartments ?? []).map((a, i) => [a.id, APARTMENT_COLORS[i % APARTMENT_COLORS.length]])
  );

  // Verfügbarkeitsabfrage für einen frei wählbaren Zeitraum: eine Wohnung ist
  // frei, wenn keine Buchung den Zeitraum überlappt (end_date ist exklusiv,
  // d.h. am Abreisetag ist die Wohnung wieder verfügbar).
  const availabilityFrom = fromParam && /^\d{4}-\d{2}-\d{2}$/.test(fromParam) ? fromParam : null;
  const availabilityTo = toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam) ? toParam : null;
  let freeApartments: { id: string; name: string }[] | null = null;
  if (availabilityFrom && availabilityTo && availabilityFrom < availabilityTo) {
    const { data: overlapping } = await supabase
      .from("apartment_bookings")
      .select("apartment_id")
      .eq("org_id", profile.org_id)
      .lt("start_date", availabilityTo)
      .gt("end_date", availabilityFrom);
    const occupiedIds = new Set((overlapping ?? []).map((b) => b.apartment_id));
    freeApartments = (apartments ?? []).filter((a) => !occupiedIds.has(a.id));
  }

  const jobsByDay = new Map<string, NonNullable<typeof jobs>>();
  for (const job of jobs ?? []) {
    if (!jobsByDay.has(job.scheduled_date)) jobsByDay.set(job.scheduled_date, []);
    jobsByDay.get(job.scheduled_date)!.push(job);
  }

  function occupiedApartmentsOn(day: string) {
    return (bookings ?? []).filter((b) => b.start_date <= day && day < b.end_date);
  }

  const prevMonth = format(subMonths(monthStart, 1), "yyyy-MM");
  const nextMonth = format(addMonths(monthStart, 1), "yyyy-MM");

  const selectedJobs = jobsByDay.get(selectedDay) ?? [];
  const busyCleanerIds = new Set(selectedJobs.map((j) => j.assigned_to).filter(Boolean));
  const freeCleaners = (cleaners ?? []).filter((c) => !busyCleanerIds.has(c.id));
  const selectedOccupied = occupiedApartmentsOn(selectedDay);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">Kalender</h1>
        <div className="flex items-center gap-2">
          <Link href={`/admin/calendar?month=${prevMonth}`}>
            <Badge variant="default" className="cursor-pointer">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Badge>
          </Link>
          <span className="text-sm font-medium text-slate-700">
            {format(monthStart, "MMMM yyyy", { locale: de })}
          </span>
          <Link href={`/admin/calendar?month=${nextMonth}`}>
            <Badge variant="default" className="cursor-pointer">
              <ChevronRight className="h-3.5 w-3.5" />
            </Badge>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {(apartments ?? []).length > 0 && (
            <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1">
              {(apartments ?? []).map((a) => (
                <span key={a.id} className="inline-flex items-center gap-1.5 text-xs text-slate-600">
                  <span
                    className="h-2.5 w-2.5 rounded-sm"
                    style={{ backgroundColor: colorByApartment.get(a.id) }}
                  />
                  {a.name}
                </span>
              ))}
              <span className="text-xs text-slate-400">Balken = vermietet/belegt</span>
            </div>
          )}
          <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-slate-400">
            {WEEKDAYS.map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-x-0 gap-y-1">
            {days.map((day) => {
              const dayStr = format(day, "yyyy-MM-dd");
              const nextDayStr = format(addDays(day, 1), "yyyy-MM-dd");
              const dayJobs = jobsByDay.get(dayStr) ?? [];
              const dayBookings = occupiedApartmentsOn(dayStr);
              const inMonth = isSameMonth(day, monthStart);
              const selected = dayStr === selectedDay;
              return (
                <Link
                  key={dayStr}
                  href={`/admin/calendar?month=${format(monthStart, "yyyy-MM")}&day=${dayStr}`}
                  className={`mx-0.5 flex min-h-24 flex-col gap-1 rounded-md border p-1.5 text-xs ${
                    selected
                      ? "border-slate-900 bg-slate-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  } ${inMonth ? "" : "opacity-40"}`}
                >
                  <span className={isToday(day) ? "font-semibold text-slate-900" : "text-slate-500"}>
                    {format(day, "d")}
                  </span>
                  <div className="flex flex-wrap gap-0.5">
                    {dayJobs.slice(0, 4).map((j) => (
                      <span
                        key={j.id}
                        className={`h-1.5 w-1.5 rounded-full ${
                          j.status === "completed"
                            ? "bg-emerald-500"
                            : j.status === "in_progress"
                              ? "bg-blue-500"
                              : j.status === "problem_reported"
                                ? "bg-red-500"
                                : "bg-slate-400"
                        }`}
                      />
                    ))}
                  </div>
                  {/* Belegungsbalken: einer pro vermieteter Wohnung. Abgerundetes
                      Ende markiert Anreise- (links) bzw. Abreisetag (rechts);
                      dazwischen laufen die Balken über den Zellrand durch. */}
                  <div className="mt-auto flex flex-col gap-0.5">
                    {(apartments ?? []).map((a) => {
                      const booking = dayBookings.find((b) => b.apartment_id === a.id);
                      if (!booking) return null;
                      const isStart = booking.start_date === dayStr;
                      const isEnd = booking.end_date === nextDayStr;
                      const apartment = Array.isArray(booking.apartments)
                        ? booking.apartments[0]
                        : booking.apartments;
                      return (
                        <span
                          key={a.id}
                          title={`${apartment?.name ?? ""}: ${format(parseISO(booking.start_date), "d.MM.", { locale: de })} – ${format(parseISO(booking.end_date), "d.MM.yyyy", { locale: de })}${booking.summary ? ` · ${booking.summary}` : ""}`}
                          className={`h-1.5 ${isStart ? "ml-0 rounded-l-full" : "-ml-2"} ${
                            isEnd ? "mr-0 rounded-r-full" : "-mr-2"
                          }`}
                          style={{ backgroundColor: colorByApartment.get(a.id) }}
                        />
                      );
                    })}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Verfügbarkeit prüfen</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {/* GET-Formular: schreibt from/to in die URL, Ergebnis wird
                  server-seitig berechnet. month/day bleiben erhalten. */}
              <form method="get" className="flex flex-col gap-3">
                <input type="hidden" name="month" value={format(monthStart, "yyyy-MM")} />
                {dayParam && <input type="hidden" name="day" value={dayParam} />}
                <div className="flex gap-2">
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="from" className="text-xs">
                      Von
                    </Label>
                    <Input
                      id="from"
                      name="from"
                      type="date"
                      className="h-9 text-sm"
                      defaultValue={availabilityFrom ?? ""}
                      required
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-1">
                    <Label htmlFor="to" className="text-xs">
                      Bis
                    </Label>
                    <Input
                      id="to"
                      name="to"
                      type="date"
                      className="h-9 text-sm"
                      defaultValue={availabilityTo ?? ""}
                      required
                    />
                  </div>
                </div>
                <Button type="submit" size="sm">
                  Freie Wohnungen anzeigen
                </Button>
              </form>

              {freeApartments !== null && (
                <div className="border-t border-slate-100 pt-3">
                  <p className="mb-1.5 text-xs text-slate-400">
                    Frei vom {format(parseISO(availabilityFrom!), "d.MM.", { locale: de })} bis{" "}
                    {format(parseISO(availabilityTo!), "d.MM.yyyy", { locale: de })}:
                  </p>
                  {freeApartments.length === 0 ? (
                    <p className="text-sm text-slate-400">
                      Keine Wohnung ist im gesamten Zeitraum frei.
                    </p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {freeApartments.map((a) => (
                        <li key={a.id} className="flex items-center gap-2 text-sm">
                          <span
                            className="h-2.5 w-2.5 shrink-0 rounded-sm"
                            style={{ backgroundColor: colorByApartment.get(a.id) }}
                          />
                          <Link href={`/admin/apartments/${a.id}`} className="hover:underline">
                            {a.name}
                          </Link>
                          <Badge variant="green">Frei</Badge>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {availabilityFrom && availabilityTo && availabilityFrom >= availabilityTo && (
                <p className="text-sm text-red-600">
                  Das „Bis“-Datum muss nach dem „Von“-Datum liegen.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                {format(parseISO(selectedDay), "EEEE, d. MMMM", { locale: de })}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {selectedJobs.length === 0 ? (
                <p className="text-sm text-slate-400">Keine Reinigungen geplant.</p>
              ) : (
                selectedJobs.map((job) => {
                  const apartment = Array.isArray(job.apartments) ? job.apartments[0] : job.apartments;
                  const cleaner = Array.isArray(job.profiles) ? job.profiles[0] : job.profiles;
                  return (
                    <div key={job.id} className="flex items-center justify-between text-sm">
                      <div>
                        <p>{apartment?.name}</p>
                        <p className="text-xs text-slate-400">{cleaner?.full_name ?? "Nicht zugewiesen"}</p>
                      </div>
                      <Badge variant={statusVariant(job.status as CleaningJobStatus)}>
                        {CLEANING_JOB_STATUS_LABELS[job.status as CleaningJobStatus]}
                      </Badge>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Freie Kapazitäten</CardTitle>
            </CardHeader>
            <CardContent>
              {freeCleaners.length === 0 ? (
                <p className="text-sm text-slate-400">Alle Reinigungskräfte sind an diesem Tag verplant.</p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm">
                  {freeCleaners.map((c) => (
                    <li key={c.id}>{c.full_name}</li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Belegte Wohnungen</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedOccupied.length === 0 ? (
                <p className="text-sm text-slate-400">Keine Belegungsdaten für diesen Tag.</p>
              ) : (
                <ul className="flex flex-col gap-1.5 text-sm">
                  {selectedOccupied.map((b) => {
                    const apartment = Array.isArray(b.apartments) ? b.apartments[0] : b.apartments;
                    return (
                      <li key={b.id} className="flex items-center gap-2">
                        <span
                          className="h-2.5 w-2.5 shrink-0 rounded-sm"
                          style={{ backgroundColor: colorByApartment.get(b.apartment_id) }}
                        />
                        <span>{apartment?.name}</span>
                        <span className="text-xs text-slate-400">
                          {format(parseISO(b.start_date), "d.MM.", { locale: de })} –{" "}
                          {format(parseISO(b.end_date), "d.MM.yyyy", { locale: de })}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
