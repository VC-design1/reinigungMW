import "server-only";
import { Resend } from "resend";

/**
 * Best-effort email send — silently no-ops if RESEND_API_KEY isn't
 * configured, so the app works fully without an email provider (in-app and
 * push notifications don't depend on this).
 */
export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const resend = new Resend(apiKey);
  const from = process.env.RESEND_FROM_EMAIL || "Reinigungsmanagement <notifications@example.com>";

  try {
    await resend.emails.send({ from, to, subject, html });
  } catch {
    // best-effort — in-app notification is the source of truth
  }
}
