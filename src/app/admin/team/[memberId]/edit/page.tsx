import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { updateTeamMember } from "../../actions";
import { ROLE_LABELS, type UserRole } from "@/lib/types";

export default async function EditTeamMemberPage({
  params,
  searchParams,
}: {
  params: Promise<{ memberId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { memberId } = await params;
  const { error } = await searchParams;
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", memberId)
    .single();
  if (!member) notFound();

  // Admin-Profile gehören ihren Inhabern — fremde Admin-Accounts sind tabu.
  if (member.role === "admin" && member.id !== profile.id) {
    redirect("/admin/team");
  }

  const isSelf = member.id === profile.id;

  return (
    <div className="flex max-w-lg flex-col gap-4">
      <Link href="/admin/team" className="flex items-center gap-1 text-sm text-slate-500">
        <ArrowLeft className="h-4 w-4" /> Zurück zum Team
      </Link>

      <h1 className="text-xl font-semibold tracking-tight text-slate-900">
        Profil bearbeiten{isSelf ? " (dein Account)" : ""}
      </h1>

      <Card>
        <CardHeader>
          <CardTitle>{member.email}</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateTeamMember.bind(null, member.id)} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Name</Label>
              <Input id="full_name" name="full_name" required defaultValue={member.full_name} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefon</Label>
              <Input id="phone" name="phone" defaultValue={member.phone ?? ""} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Rolle</Label>
              {isSelf ? (
                <>
                  {/* Eigene Rolle ist fix — verhindert, dass sich der letzte
                      Admin versehentlich selbst die Admin-Rechte entzieht. */}
                  <Input value={ROLE_LABELS[member.role as UserRole]} disabled />
                  <input type="hidden" name="role" value={member.role} />
                </>
              ) : (
                <Select id="role" name="role" defaultValue={member.role} required>
                  <option value="cleaner">Reinigungskraft</option>
                  <option value="landlord">Vermieter</option>
                </Select>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="active">Status</Label>
              {isSelf ? (
                <>
                  <Input value="Aktiv" disabled />
                  <input type="hidden" name="active" value="true" />
                </>
              ) : (
                <Select id="active" name="active" defaultValue={member.active ? "true" : "false"}>
                  <option value="true">Aktiv</option>
                  <option value="false">Deaktiviert</option>
                </Select>
              )}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="self-start">
              Speichern
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
