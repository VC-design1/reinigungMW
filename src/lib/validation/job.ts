import { z } from "zod";

export const jobSchema = z.object({
  apartment_id: z.string().uuid("Bitte eine Wohnung auswählen."),
  assigned_to: z.string().uuid("Bitte eine Reinigungskraft auswählen.").optional().or(z.literal("")),
  checklist_template_id: z.string().uuid().optional().or(z.literal("")),
  scheduled_date: z.string().min(1, "Datum ist erforderlich."),
  scheduled_start: z.string().optional().or(z.literal("")),
  scheduled_end: z.string().optional().or(z.literal("")),
});

export type JobInput = z.infer<typeof jobSchema>;
