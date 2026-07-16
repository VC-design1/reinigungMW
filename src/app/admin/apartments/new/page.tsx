import { ApartmentForm } from "../apartment-form";
import { createApartment } from "../actions";

export default async function NewApartmentPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Neue Wohnung</h1>
      <ApartmentForm action={createApartment} error={error} />
    </div>
  );
}
