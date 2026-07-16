import { notFound } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApartmentForm } from "../../apartment-form";
import { updateApartment } from "../../actions";

export default async function EditApartmentPage({
  params,
  searchParams,
}: {
  params: Promise<{ apartmentId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { apartmentId } = await params;
  const { error } = await searchParams;
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const [{ data: apartment }, { data: landlords }, { data: cleaners }] = await Promise.all([
    supabase.from("apartments").select("*").eq("id", apartmentId).single(),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", profile.org_id)
      .eq("role", "landlord")
      .eq("active", true)
      .order("full_name"),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("org_id", profile.org_id)
      .eq("role", "cleaner")
      .eq("active", true)
      .order("full_name"),
  ]);
  if (!apartment) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">{apartment.name} bearbeiten</h1>
      <ApartmentForm
        action={updateApartment.bind(null, apartmentId)}
        apartment={apartment}
        error={error}
        landlords={landlords ?? []}
        cleaners={cleaners ?? []}
      />
    </div>
  );
}
