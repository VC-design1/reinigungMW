import { enqueue, isNetworkError, processQueue, type QueueItemKind } from "./queue";
import {
  submitChecklistUpdate,
  submitIssueReport,
  submitPhotoUpload,
  submitStatusUpdate,
} from "@/lib/jobs/mutations";

/**
 * Try to run a mutation immediately; if it fails because we're offline (or
 * the device has a flaky mobile connection), park it in the IndexedDB queue
 * instead of losing the data. Callers should update local UI state
 * optimistically regardless of the return value.
 */
export async function runOrQueue<T>(
  kind: QueueItemKind,
  payload: T,
  executor: (payload: T) => Promise<void>
): Promise<{ queued: boolean }> {
  try {
    await executor(payload);
    return { queued: false };
  } catch (err) {
    if (isNetworkError(err)) {
      await enqueue(kind, payload);
      return { queued: true };
    }
    throw err;
  }
}

const handlers: Record<QueueItemKind, (payload: unknown) => Promise<void>> = {
  checklist: (p) => submitChecklistUpdate(p as Parameters<typeof submitChecklistUpdate>[0]),
  status: (p) => submitStatusUpdate(p as Parameters<typeof submitStatusUpdate>[0]),
  issue: (p) => submitIssueReport(p as Parameters<typeof submitIssueReport>[0]),
  photo: (p) => submitPhotoUpload(p as Parameters<typeof submitPhotoUpload>[0]),
};

export async function flushOfflineQueue() {
  return processQueue(handlers);
}
