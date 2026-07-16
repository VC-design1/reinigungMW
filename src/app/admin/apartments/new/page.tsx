import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApartmentForm } from "../apartment-form";
import { createApartment } from "../actions";

export default async function NewApartmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const [{ data: landlords }, { data: cleaners }] = await Promise.all([
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

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Neue Wohnung</h1>
      <ApartmentForm
        action={createApartment}
        error={error}
        landlords={landlords ?? []}
        cleaners={cleaners ?? []}
      />
    </div>
  );
}
