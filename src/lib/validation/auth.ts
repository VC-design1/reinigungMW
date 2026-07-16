import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(6, "Passwort muss mindestens 6 Zeichen haben."),
});

export type LoginInput = z.infer<typeof loginSchema>;
