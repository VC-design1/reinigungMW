"use client";

import { useRef, useState } from "react";
import { Camera, Loader2 } from "lucide-react";
import imageCompression from "browser-image-compression";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Photo, PhotoPhase } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

interface Props {
  rooms: string[];
  photos: (Photo & { url: string | null })[];
  onAddPhoto: (input: { roomName: string; phase: PhotoPhase; file: File }) => Promise<void>;
  disabled?: boolean;
  dict: Dictionary;
}

export function PhotoSection({ rooms, photos, onAddPhoto, disabled, dict }: Props) {
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const PHASES: { key: PhotoPhase; label: string }[] = [
    { key: "before", label: dict.job.photoBefore },
    { key: "after", label: dict.job.photoAfter },
    { key: "issue", label: dict.job.photoIssue },
  ];

  async function handleFile(roomName: string, phase: PhotoPhase, file: File) {
    const key = `${roomName}:${phase}`;
    setUploadingKey(key);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      await onAddPhoto({ roomName, phase, file: compressed as File });
    } finally {
      setUploadingKey(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {rooms.map((room) => {
        const roomPhotos = photos.filter((p) => p.room_name === room);
        return (
          <Card key={room}>
            <CardHeader>
              <CardTitle>{room}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                {PHASES.map(({ key, label }) => {
                  const inputKey = `${room}:${key}`;
                  return (
                    <div key={inputKey}>
                      <input
                        ref={(el) => {
                          inputRefs.current[inputKey] = el;
                        }}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFile(room, key, file);
                          e.target.value = "";
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={disabled || uploadingKey === inputKey}
                        onClick={() => inputRefs.current[inputKey]?.click()}
                      >
                        {uploadingKey === inputKey ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Camera className="h-4 w-4" />
                        )}
                        {label}
                      </Button>
                    </div>
                  );
                })}
              </div>
              {roomPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {roomPhotos.map((p) => (
                    <div key={p.id} className="relative aspect-square overflow-hidden rounded-md bg-slate-100">
                      {p.url && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.url} alt={p.phase} className="h-full w-full object-cover" />
                      )}
                      <span className="absolute bottom-0.5 right-0.5 rounded bg-black/60 px-1 text-[10px] text-white">
                        {p.phase === "before"
                          ? dict.job.photoBefore
                          : p.phase === "after"
                            ? dict.job.photoAfter
                            : dict.job.photoIssue}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
