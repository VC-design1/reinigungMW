import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createTeamMember, setMemberActive } from "./actions";
import { StarRatingDisplay } from "@/components/star-rating-display";

export default async function TeamPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error, created } = await searchParams;
  const profile = await requireProfile("admin");
  const supabase = await createClient();

  const { data: members } = await supabase
    .from("profiles")
    .select("*")
    .eq("org_id", profile.org_id)
    .order("role")
    .order("full_name");

  const { data: ratings } = await supabase
    .from("cleaning_ratings")
    .select("cleaner_id, rating")
    .eq("org_id", profile.org_id);

  const avgRatingByCleaner = new Map<string, number>();
  const grouped = new Map<string, number[]>();
  for (const r of ratings ?? []) {
    if (!r.cleaner_id) continue;
    if (!grouped.has(r.cleaner_id)) grouped.set(r.cleaner_id, []);
    grouped.get(r.cleaner_id)!.push(r.rating);
  }
  for (const [cleanerId, values] of grouped) {
    avgRatingByCleaner.set(cleanerId, values.reduce((a, b) => a + b, 0) / values.length);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight text-slate-900">Team</h1>

      <Card>
        <CardHeader>
          <CardTitle>Mitglieder</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {(members ?? []).map((member) => (
            <div key={member.id} className="flex items-center justify-between rounded-md border border-slate-200 p-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{member.full_name}</p>
                <p className="text-xs text-slate-400">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={member.role === "admin" ? "blue" : "default"}>
                  {member.role === "admin" ? "Admin" : "Reinigungskraft"}
                </Badge>
                <Badge variant={member.active ? "green" : "red"}>
                  {member.active ? "Aktiv" : "Deaktiviert"}
                </Badge>
                {member.role === "cleaner" && avgRatingByCleaner.has(member.id) && (
                  <StarRatingDisplay rating={avgRatingByCleaner.get(member.id)!} />
                )}
                {member.id !== profile.id && (
                  <form action={setMemberActive.bind(null, member.id, !member.active)}>
                    <Button type="submit" size="sm" variant="outline">
                      {member.active ? "Deaktivieren" : "Aktivieren"}
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Neues Teammitglied anlegen</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={createTeamMember} className="flex max-w-md flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">Rolle</Label>
              <Select id="role" name="role" defaultValue="cleaner" required>
                <option value="cleaner">Reinigungskraft</option>
                <option value="admin">Vermieter/Admin</option>
              </Select>
              <p className="text-xs text-slate-500">
                Admins sehen den Vermieter-Bereich und können Wohnungen, Aufträge und das Team
                verwalten. Reinigungskräfte sehen nur ihre eigenen Aufträge.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">Name</Label>
              <Input id="full_name" name="full_name" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">E-Mail</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Telefon (optional)</Label>
              <Input id="phone" name="phone" />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Initial-Passwort</Label>
              <Input id="password" name="password" type="text" minLength={8} required />
              <p className="text-xs text-slate-500">
                Bitte direkt an die Person weitergeben; sie kann es nach dem ersten Login ändern.
              </p>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            {created && <p className="text-sm text-emerald-600">Account wurde angelegt.</p>}
            <Button type="submit">Account anlegen</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
