import { z } from "zod";

export const apartmentSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich."),
  address: z.string().min(1, "Adresse ist erforderlich."),
  room_count: z.coerce.number().int().min(1, "Mindestens 1 Zimmer."),
  description: z.string().optional(),
  occupancy_status: z.enum(["free", "occupied"]).default("free"),
  ical_url: z.string().url("Bitte eine gültige URL angeben.").optional().or(z.literal("")),
});

export type ApartmentInput = z.infer<typeof apartmentSchema>;

export const inventoryItemSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich."),
  category: z.string().optional(),
  notes: z.string().optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

// Manuelle Buchung/Reservierung. end_date ist der Abreisetag und damit
// exklusiv — am Abreisetag gilt die Wohnung wieder als frei (gleiches
// Modell wie beim iCal-Import und der Kalender-Verfügbarkeitsprüfung).
export const bookingSchema = z
  .object({
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein Anreisedatum wählen."),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitte ein Abreisedatum wählen."),
    summary: z.string().optional(),
  })
  .refine((d) => d.start_date < d.end_date, {
    message: "Die Abreise muss nach der Anreise liegen.",
  });

export type BookingInput = z.infer<typeof bookingSchema>;
