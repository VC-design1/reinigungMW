import "server-only";
import webpush from "web-push";

let configured = false;

function ensureConfigured(): boolean {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

export interface PushPayload {
  title: string;
  body?: string;
  url?: string;
}

export async function sendPushToSubscriptions(
  subscriptions: { endpoint: string; p256dh: string; auth: string }[],
  payload: PushPayload
): Promise<void> {
  if (subscriptions.length === 0 || !ensureConfigured()) return;

  await Promise.all(
    subscriptions.map((sub) =>
      webpush
        .sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload)
        )
        .catch(() => {
          // expired/invalid subscriptions are common and non-fatal; a
          // production setup would prune them here on a 404/410 response.
        })
    )
  );
}
