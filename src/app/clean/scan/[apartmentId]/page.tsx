import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { format } from "date-fns";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n/dictionaries";

export default async function ScanApartmentPage({
  params,
}: {
  params: Promise<{ apartmentId: string }>;
}) {
  const { apartmentId } = await params;
  const profile = await requireProfile();
  const supabase = await createClient();
  const dict = getDictionary((profile.locale === "en" ? "en" : "de") as Locale);

  const { data: apartment } = await supabase
    .from("apartments")
    .select("id, name")
    .eq("id", apartmentId)
    .single();
  if (!apartment) notFound();

  const today = format(new Date(), "yyyy-MM-dd");

  const { data: job } = await supabase
    .from("cleaning_jobs")
    .select("id, scheduled_date")
    .eq("apartment_id", apartmentId)
    .eq("assigned_to", profile.id)
    .gte("scheduled_date", today)
    .order("scheduled_date", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (job && job.scheduled_date === today) {
    redirect(`/clean/jobs/${job.id}`);
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-sm">
        <CardContent className="flex flex-col items-center gap-3 p-6 text-center">
          <p className="font-medium text-slate-900">{apartment.name}</p>
          {job ? (
            <>
              <p className="text-sm text-slate-500">
                {dict.scan.noJobToday.replace(
                  "{date}",
                  format(new Date(job.scheduled_date), "d. MMMM yyyy")
                )}
              </p>
              <Link href={`/clean/jobs/${job.id}`}>
                <Button size="sm">{dict.scan.openAnyway}</Button>
              </Link>
            </>
          ) : (
            <p className="text-sm text-slate-500">{dict.scan.noJob}</p>
          )}
          <Link href="/clean" className="text-sm text-slate-400 underline">
            {dict.scan.backToOverview}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
