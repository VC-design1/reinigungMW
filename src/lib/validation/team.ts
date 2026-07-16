import { z } from "zod";

export const createCleanerSchema = z.object({
  full_name: z.string().min(1, "Name ist erforderlich."),
  email: z.string().email("Bitte eine gültige E-Mail-Adresse angeben."),
  phone: z.string().optional(),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben."),
});

export type CreateCleanerInput = z.infer<typeof createCleanerSchema>;
