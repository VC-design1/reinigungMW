import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Apartment } from "@/lib/types";

interface PersonOption {
  id: string;
  full_name: string;
}

interface Props {
  action: (formData: FormData) => void;
  apartment?: Apartment;
  error?: string;
  landlords: PersonOption[];
  cleaners: PersonOption[];
  /** Vermieter legen Wohnungen immer für sich selbst an — die
   * Vermieter-Auswahl sehen nur Admins. */
  showOwnerSelect?: boolean;
}

export function ApartmentForm({
  action,
  apartment,
  error,
  landlords,
  cleaners,
  showOwnerSelect = true,
}: Props) {
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="name">Name/Nummer</Label>
        <Input id="name" name="name" required defaultValue={apartment?.name} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="address">Adresse</Label>
        <Input id="address" name="address" required defaultValue={apartment?.address} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="room_count">Anzahl Zimmer</Label>
        <Input
          id="room_count"
          name="room_count"
          type="number"
          min={1}
          required
          defaultValue={apartment?.room_count ?? 1}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="occupancy_status">Belegungsstatus</Label>
        <Select id="occupancy_status" name="occupancy_status" defaultValue={apartment?.occupancy_status ?? "free"}>
          <option value="free">Frei</option>
          <option value="occupied">Belegt</option>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Beschreibung (optional)</Label>
        <Textarea id="description" name="description" defaultValue={apartment?.description ?? ""} />
      </div>
      {showOwnerSelect && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="owner_id">Vermieter (optional)</Label>
          <Select id="owner_id" name="owner_id" defaultValue={apartment?.owner_id ?? ""}>
            <option value="">Kein Vermieter zugeordnet (nur Admins)</option>
            {landlords.map((l) => (
              <option key={l.id} value={l.id}>
                {l.full_name}
              </option>
            ))}
          </Select>
          <p className="text-xs text-slate-500">
            Der zugeordnete Vermieter sieht diese Wohnung in seinem Bereich und wird bei
            abgeschlossenen Reinigungen und Problemen mitbenachrichtigt.
          </p>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="default_cleaner_id">Stamm-Reinigungskraft (optional)</Label>
        <Select id="default_cleaner_id" name="default_cleaner_id" defaultValue={apartment?.default_cleaner_id ?? ""}>
          <option value="">Keine — Auto-Aufträge bleiben unzugewiesen</option>
          {cleaners.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </Select>
        <p className="text-xs text-slate-500">
          Endet eine Buchung, wird automatisch eine Reinigung am Abreisetag eingeplant und dieser
          Reinigungskraft zugewiesen.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="ical_url">iCal-URL (optional, Airbnb/Booking Export)</Label>
        <Input
          id="ical_url"
          name="ical_url"
          type="url"
          placeholder="https://www.airbnb.de/calendar/ical/..."
          defaultValue={apartment?.ical_url ?? ""}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit">{apartment ? "Speichern" : "Wohnung anlegen"}</Button>
    </form>
  );
}
