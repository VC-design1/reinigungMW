"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Button } from "@/components/ui/button";

interface Props {
  apartmentId: string;
  apartmentName: string;
}

export function ApartmentQrCode({ apartmentId, apartmentName }: Props) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [scanUrl, setScanUrl] = useState<string>("");

  useEffect(() => {
    // window.location is only available client-side, so the scan URL and QR
    // image can't be derived during the (server-rendered) first render.
    const url = `${window.location.origin}/clean/scan/${apartmentId}`;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setScanUrl(url);
    QRCode.toDataURL(url, { width: 240, margin: 1 }).then(setDataUrl);
  }, [apartmentId]);

  if (!dataUrl) return <p className="text-sm text-slate-400">QR-Code wird erzeugt…</p>;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={dataUrl} alt={`QR-Code für ${apartmentName}`} className="h-48 w-48" />
      <p className="break-all text-center text-xs text-slate-400">{scanUrl}</p>
      <div className="flex gap-2">
        <a href={dataUrl} download={`qr-${apartmentName}.png`}>
          <Button type="button" size="sm" variant="outline">
            Herunterladen
          </Button>
        </a>
        <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
          Drucken
        </Button>
      </div>
    </div>
  );
}
