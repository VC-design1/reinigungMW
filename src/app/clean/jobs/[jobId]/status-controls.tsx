"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CleaningJobStatus } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface Props {
  status: CleaningJobStatus;
  busy: boolean;
  onStart: () => void;
  onComplete: () => void;
  dict: Dictionary;
}

function statusVariant(status: CleaningJobStatus) {
  switch (status) {
    case "completed":
      return "green" as const;
    case "in_progress":
      return "blue" as const;
    case "problem_reported":
      return "red" as const;
    default:
      return "default" as const;
  }
}

export function StatusControls({ status, busy, onStart, onComplete, dict }: Props) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4">
      <div>
        <p className="text-xs text-slate-500">{dict.job.status}</p>
        <Badge variant={statusVariant(status)}>{dict.statusLabels[status]}</Badge>
      </div>
      <div className="flex gap-2">
        {status === "scheduled" && (
          <Button size="sm" disabled={busy} onClick={onStart}>
            {dict.job.statusStart}
          </Button>
        )}
        {(status === "scheduled" || status === "in_progress") && (
          <Button size="sm" variant="success" disabled={busy} onClick={onComplete}>
            {dict.job.statusComplete}
          </Button>
        )}
      </div>
    </div>
  );
}
