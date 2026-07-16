import { z } from "zod";

export const templateItemSchema = z.object({
  room_name: z.string().min(1),
  label: z.string().min(1),
});

export const templateSchema = z.object({
  name: z.string().min(1, "Name ist erforderlich."),
  description: z.string().optional(),
  items: z.array(templateItemSchema).min(1, "Mindestens ein Checklisten-Punkt ist erforderlich."),
});

export type TemplateInput = z.infer<typeof templateSchema>;
