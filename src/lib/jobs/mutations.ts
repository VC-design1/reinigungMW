import { createClient } from "@/lib/supabase/client";
import type { CleaningJobStatus, IssueCategory, IssuePriority, PhotoPhase } from "@/lib/types";

export interface ChecklistUpdatePayload {
  resultId: string;
  checked: boolean;
  note: string | null;
}

export async function submitChecklistUpdate(payload: ChecklistUpdatePayload) {
  const supabase = createClient();
  const { error } = await supabase
    .from("cleaning_job_checklist_results")
    .update({ checked: payload.checked, note: payload.note })
    .eq("id", payload.resultId);
  if (error) throw error;
}

export interface StatusUpdatePayload {
  jobId: string;
  status: CleaningJobStatus;
  started_at?: string | null;
  completed_at?: string | null;
}

export async function submitStatusUpdate(payload: StatusUpdatePayload) {
  const supabase = createClient();
  const { jobId, ...patch } = payload;
  const { error } = await supabase.from("cleaning_jobs").update(patch).eq("id", jobId);
  if (error) throw error;

  if (payload.status === "completed") {
    // best-effort — in-app notification for admins; skipped silently if offline,
    // the status update above is the source of truth and already synced.
    fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "cleaning_completed", jobId }),
    }).catch(() => {});
  }
}

export async function submitIssueReport(payload: IssueReportPayload) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profil nicht gefunden");

  const { error } = await supabase.from("issue_reports").insert({
    id: payload.id,
    cleaning_job_id: payload.jobId,
    apartment_id: payload.apartmentId,
    org_id: profile.org_id,
    category: payload.category,
    description: payload.description,
    priority: payload.priority,
    reported_by: user.id,
  });
  if (error) throw error;

  fetch("/api/notify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "issue_reported", issueId: payload.id }),
  }).catch(() => {});
}

export interface IssueReportPayload {
  id: string;
  jobId: string;
  apartmentId: string;
  category: IssueCategory;
  description: string;
  priority: IssuePriority;
}


export interface PhotoUploadPayload {
  id: string;
  jobId: string;
  roomName: string;
  phase: PhotoPhase;
  fileName: string;
  fileType: string;
  fileData: Blob;
}

export async function submitPhotoUpload(payload: PhotoUploadPayload) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet");

  const { data: profile } = await supabase
    .from("profiles")
    .select("org_id")
    .eq("id", user.id)
    .single();
  if (!profile) throw new Error("Profil nicht gefunden");

  const storagePath = `${profile.org_id}/${payload.jobId}/${payload.id}-${payload.fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("cleaning-photos")
    .upload(storagePath, payload.fileData, { contentType: payload.fileType, upsert: false });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("photos").insert({
    id: payload.id,
    cleaning_job_id: payload.jobId,
    org_id: profile.org_id,
    room_name: payload.roomName,
    phase: payload.phase,
    storage_path: storagePath,
    uploaded_by: user.id,
  });
  if (insertError) throw insertError;
}
