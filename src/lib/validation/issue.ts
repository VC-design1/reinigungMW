import { z } from "zod";

export const issueReportSchema = z.object({
  category: z.enum(["damage", "wear", "missing_item", "cleaning_not_possible", "other"]),
  description: z.string().min(3, "Bitte kurz beschreiben, was aufgefallen ist."),
});

export type IssueReportInput = z.infer<typeof issueReportSchema>;

/** Damage and "cleaning not possible" are treated as critical by default so
 * the landlord is alerted immediately; everything else is logged as normal
 * priority. Priority can be re-escalated manually by an admin later. */
export function priorityForCategory(category: IssueReportInput["category"]) {
  return category === "damage" || category === "cleaning_not_possible" ? "critical" : "normal";
}
