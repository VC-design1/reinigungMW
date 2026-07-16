import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { Apartment } from "@/lib/types";

interface Props {
  action: (formData: FormData) => void;
  apartment?: Apartment;
  error?: string;
}

export function ApartmentForm({ action, apartment, error }: Props) {
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
