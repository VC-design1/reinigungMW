"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteTeamMember } from "./actions";

export function DeleteMemberButton({ memberId, memberName }: { memberId: string; memberName: string }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const ok = window.confirm(
      `„${memberName}" endgültig löschen?\n\nDer Account kann sich danach nicht mehr anmelden. ` +
        `Die Reinigungshistorie (Aufträge, Fotos, Meldungen) bleibt erhalten.`
    );
    if (!ok) return;
    startTransition(() => deleteTeamMember(memberId));
  }

  return (
    <Button type="button" size="sm" variant="destructive" disabled={pending} onClick={handleClick}>
      {pending ? "Löschen…" : "Löschen"}
    </Button>
  );
}
