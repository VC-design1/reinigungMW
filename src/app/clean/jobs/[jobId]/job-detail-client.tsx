"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ChecklistSection } from "./checklist-section";
import { PhotoSection } from "./photo-section";
import { IssueSection } from "./issue-section";
import { StatusControls } from "./status-controls";
import { runOrQueue } from "@/lib/offline/sync";
import {
  submitChecklistUpdate,
  submitIssueReport,
  submitPhotoUpload,
  submitStatusUpdate,
} from "@/lib/jobs/mutations";
import { priorityForCategory } from "@/lib/validation/issue";
import type { IssueReportInput } from "@/lib/validation/issue";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type {
  Apartment,
  CleaningJob,
  CleaningJobChecklistResult,
  IssueReport,
  Photo,
  PhotoPhase,
} from "@/lib/types";

interface Props {
  job: CleaningJob;
  apartment: Apartment;
  initialResults: CleaningJobChecklistResult[];
  initialPhotos: (Photo & { url: string | null })[];
  initialIssues: IssueReport[];
  profileId: string;
  dict: Dictionary;
}

export function JobDetailClient({
  job,
  apartment,
  initialResults,
  initialPhotos,
  initialIssues,
  profileId,
  dict,
}: Props) {
  const router = useRouter();
  const [status, setStatus] = useState(job.status);
  const [results, setResults] = useState(initialResults);
  const [photos, setPhotos] = useState(initialPhotos);
  const [issues, setIssues] = useState(initialIssues);
  const [busy, setBusy] = useState(false);

  const rooms = useMemo(() => {
    // Räume kommen primär aus der Checkliste; ohne Checkliste werden sie aus
    // der Wohnung abgeleitet (Küche, Bad, Raum 1..n), damit Fotos immer einem
    // konkreten Raum zugeordnet werden. Räume bereits hochgeladener Fotos
    // bleiben sichtbar, auch wenn sie in keiner Liste stehen.
    const seen: string[] = [];
    for (const r of results) if (!seen.includes(r.room_name)) seen.push(r.room_name);
    if (seen.length === 0) {
      seen.push("Küche", "Bad");
      for (let i = 1; i <= Math.max(1, apartment.room_count); i += 1) {
        seen.push(`Raum ${i}`);
      }
    }
    for (const p of photos) if (!seen.includes(p.room_name)) seen.push(p.room_name);
    return seen;
  }, [results, photos, apartment.room_count]);

  const isDisabled = status === "completed";

  async function handleToggle(resultId: string, checked: boolean) {
    setResults((prev) => prev.map((r) => (r.id === resultId ? { ...r, checked } : r)));
    await runOrQueue("checklist", { resultId, checked, note: results.find((r) => r.id === resultId)?.note ?? null }, submitChecklistUpdate);
  }

  async function handleNoteChange(resultId: string, note: string) {
    setResults((prev) => prev.map((r) => (r.id === resultId ? { ...r, note } : r)));
    const current = results.find((r) => r.id === resultId);
    await runOrQueue(
      "checklist",
      { resultId, checked: current?.checked ?? false, note },
      submitChecklistUpdate
    );
  }

  async function handleAddPhoto({
    roomName,
    phase,
    file,
  }: {
    roomName: string;
    phase: PhotoPhase;
    file: File;
  }) {
    const id = crypto.randomUUID();
    const localUrl = URL.createObjectURL(file);
    setPhotos((prev) => [
      ...prev,
      {
        id,
        cleaning_job_id: job.id,
        org_id: job.org_id,
        room_name: roomName,
        phase,
        storage_path: "",
        uploaded_by: profileId,
        created_at: new Date().toISOString(),
        url: localUrl,
      },
    ]);
    await runOrQueue(
      "photo",
      {
        id,
        jobId: job.id,
        roomName,
        phase,
        fileName: file.name,
        fileType: file.type,
        fileData: file,
      },
      submitPhotoUpload
    );
  }

  async function handleIssueSubmit(input: IssueReportInput) {
    const id = crypto.randomUUID();
    const priority = priorityForCategory(input.category);
    setIssues((prev) => [
      {
        id,
        cleaning_job_id: job.id,
        apartment_id: apartment.id,
        org_id: job.org_id,
        category: input.category,
        description: input.description,
        priority,
        status: "open",
        reported_by: profileId,
        created_at: new Date().toISOString(),
        resolved_at: null,
      },
      ...prev,
    ]);

    await runOrQueue(
      "issue",
      { id, jobId: job.id, apartmentId: apartment.id, category: input.category, description: input.description, priority },
      submitIssueReport
    );

    if (priority === "critical" && status !== "completed") {
      await handleStatusChange("problem_reported");
    }
  }

  async function handleStatusChange(next: CleaningJob["status"]) {
    setBusy(true);
    const patch =
      next === "in_progress"
        ? { started_at: new Date().toISOString() }
        : next === "completed"
          ? { completed_at: new Date().toISOString() }
          : {};
    setStatus(next);
    try {
      await runOrQueue(
        "status",
        { jobId: job.id, status: next, ...patch },
        submitStatusUpdate
      );
    } finally {
      setBusy(false);
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Link href="/clean" className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft className="h-4 w-4" /> {dict.job.back}
      </Link>

      <div>
        <h1 className="text-xl font-semibold tracking-tight text-slate-900">{apartment.name}</h1>
        <p className="text-sm text-slate-500">{apartment.address}</p>
      </div>

      <StatusControls
        status={status}
        busy={busy}
        onStart={() => handleStatusChange("in_progress")}
        onComplete={() => handleStatusChange("completed")}
        dict={dict}
      />

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{dict.job.checklist}</h2>
        <ChecklistSection
          results={results}
          onToggle={handleToggle}
          onNoteChange={handleNoteChange}
          disabled={isDisabled}
          dict={dict}
        />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-slate-700">{dict.job.photos}</h2>
        <PhotoSection rooms={rooms} photos={photos} onAddPhoto={handleAddPhoto} disabled={isDisabled} dict={dict} />
      </section>

      <section>
        <IssueSection issues={issues} onSubmit={handleIssueSubmit} disabled={isDisabled} dict={dict} />
      </section>
    </div>
  );
}
