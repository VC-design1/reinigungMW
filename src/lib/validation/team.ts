import { z } from "zod";

export const createTeamMemberSchema = z.object({
  full_name: z.string().min(1, "Name ist erforderlich."),
  email: z.string().email("Bitte eine gültige E-Mail-Adresse angeben."),
  phone: z.string().optional(),
  password: z.string().min(8, "Passwort muss mindestens 8 Zeichen haben."),
  role: z.enum(["cleaner", "landlord", "admin"], { message: "Bitte eine Rolle wählen." }),
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberSchema>;

export const updateTeamMemberSchema = z.object({
  full_name: z.string().min(1, "Name ist erforderlich."),
  phone: z.string().optional(),
  role: z.enum(["cleaner", "landlord", "admin"], { message: "Bitte eine Rolle wählen." }),
  active: z.enum(["true", "false"]).transform((v) => v === "true"),
});

export type UpdateTeamMemberInput = z.infer<typeof updateTeamMemberSchema>;
