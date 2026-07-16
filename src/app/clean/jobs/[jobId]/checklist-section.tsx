"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CleaningJobChecklistResult } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface Props {
  results: CleaningJobChecklistResult[];
  onToggle: (resultId: string, checked: boolean) => void;
  onNoteChange: (resultId: string, note: string) => void;
  disabled?: boolean;
  dict: Dictionary;
}

export function ChecklistSection({ results, onToggle, onNoteChange, disabled, dict }: Props) {
  const [openNoteFor, setOpenNoteFor] = useState<string | null>(null);

  const byRoom = useMemo(() => {
    const map = new Map<string, CleaningJobChecklistResult[]>();
    for (const r of results) {
      if (!map.has(r.room_name)) map.set(r.room_name, []);
      map.get(r.room_name)!.push(r);
    }
    return map;
  }, [results]);

  if (results.length === 0) {
    return <p className="text-sm text-slate-400">{dict.job.checklistEmpty}</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {[...byRoom.entries()].map(([room, items]) => {
        const done = items.filter((i) => i.checked).length;
        return (
          <Card key={room}>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>{room}</CardTitle>
              <span className="text-xs text-slate-400">
                {done}/{items.length}
              </span>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {items.map((item) => (
                <div key={item.id} className="flex flex-col gap-1.5">
                  <label className="flex cursor-pointer items-start gap-3">
                    <Checkbox
                      checked={item.checked}
                      disabled={disabled}
                      onChange={(e) => onToggle(item.id, e.target.checked)}
                    />
                    <span
                      className={
                        item.checked ? "text-sm text-slate-400 line-through" : "text-sm text-slate-800"
                      }
                    >
                      {item.label}
                    </span>
                  </label>
                  <button
                    type="button"
                    className="ml-8 self-start text-xs text-slate-400 underline decoration-dotted"
                    onClick={() => setOpenNoteFor(openNoteFor === item.id ? null : item.id)}
                  >
                    {item.note ? dict.job.noteEdit : dict.job.noteAdd}
                  </button>
                  {(openNoteFor === item.id || item.note) && (
                    <Textarea
                      className="ml-8 w-auto text-sm"
                      placeholder={dict.job.notePlaceholder}
                      defaultValue={item.note ?? ""}
                      disabled={disabled}
                      onBlur={(e) => onNoteChange(item.id, e.target.value)}
                      rows={2}
                    />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
