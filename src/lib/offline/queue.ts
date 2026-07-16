import { get, set, del, keys, offlineStore } from "./db";

export type QueueItemKind = "checklist" | "issue" | "status" | "photo";

export interface QueueItem<T = unknown> {
  id: string;
  kind: QueueItemKind;
  payload: T;
  createdAt: number;
  attempts: number;
}

const KEY_PREFIX = "job:";

/**
 * Persists a failed mutation to IndexedDB so it survives page reloads and
 * can be retried once connectivity returns. Used when a direct Supabase
 * call throws a network error (offline / poor mobile reception on-site).
 */
export async function enqueue<T>(kind: QueueItemKind, payload: T): Promise<QueueItem<T>> {
  if (!offlineStore) throw new Error("Offline-Queue nur im Browser verfügbar.");
  const item: QueueItem<T> = {
    id: crypto.randomUUID(),
    kind,
    payload,
    createdAt: Date.now(),
    attempts: 0,
  };
  await set(KEY_PREFIX + item.id, item, offlineStore);
  return item;
}

export async function getQueue(): Promise<QueueItem[]> {
  if (!offlineStore) return [];
  const allKeys = await keys(offlineStore);
  const items = await Promise.all(
    allKeys
      .filter((k) => typeof k === "string" && k.startsWith(KEY_PREFIX))
      .map((k) => get<QueueItem>(k as string, offlineStore))
  );
  return items.filter((i): i is QueueItem => Boolean(i)).sort((a, b) => a.createdAt - b.createdAt);
}

export async function removeFromQueue(id: string): Promise<void> {
  if (!offlineStore) return;
  await del(KEY_PREFIX + id, offlineStore);
}

export function isNetworkError(err: unknown): boolean {
  if (typeof navigator !== "undefined" && !navigator.onLine) return true;
  if (err instanceof TypeError) return true; // fetch() network failure
  return false;
}

type Handler = (payload: unknown) => Promise<void>;

/**
 * Replays queued mutations in creation order. Stops at the first item that
 * still fails for a non-network reason (e.g. validation) so it isn't lost,
 * but keeps retrying network failures on the next flush.
 */
export async function processQueue(handlers: Record<QueueItemKind, Handler>): Promise<{
  processed: number;
  remaining: number;
}> {
  const queue = await getQueue();
  let processed = 0;

  for (const item of queue) {
    try {
      await handlers[item.kind](item.payload);
      await removeFromQueue(item.id);
      processed += 1;
    } catch (err) {
      if (isNetworkError(err)) break; // still offline, stop and retry later
      // non-network failure: bump attempts, keep item, keep going
      if (offlineStore) {
        await set(KEY_PREFIX + item.id, { ...item, attempts: item.attempts + 1 }, offlineStore);
      }
    }
  }

  const remaining = (await getQueue()).length;
  return { processed, remaining };
}
