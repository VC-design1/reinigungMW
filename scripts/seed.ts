/**
 * Seed script for local/dev setup — creates a demo organization, an admin
 * account, two cleaner accounts, a checklist template, sample apartments and
 * a few cleaning jobs (today + this week).
 *
 * Usage: npm run seed   (requires .env.local with SUPABASE_SERVICE_ROLE_KEY)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Next.js itself only reads .env.local for `next dev`/`next build`, but
// plain Node scripts don't know that convention — load it explicitly here
// (falling back to .env) so `npm run seed` picks up the same file.
config({ path: ".env.local" });
config();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error(
    "Fehlende Umgebungsvariablen: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY werden benötigt (siehe .env.example)."
  );
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const DEMO_PASSWORD = "Demo1234!";

function todayPlus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

async function main() {
  console.log("Seeding demo data …");

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: "Musterfirma Ferienwohnungen GmbH" })
    .select()
    .single();
  if (orgError) throw orgError;
  console.log("Organisation angelegt:", org.name);

  async function createUser(email: string, fullName: string, role: "admin" | "cleaner") {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { org_id: org.id, role, full_name: fullName },
    });
    if (error) throw error;
    return data.user!.id;
  }

  const adminId = await createUser("admin@example.com", "Anna Admin", "admin");
  const cleaner1Id = await createUser("cleaner1@example.com", "Carla Cleaner", "cleaner");
  const cleaner2Id = await createUser("cleaner2@example.com", "Costa Cleaner", "cleaner");
  console.log("Nutzer angelegt: admin@example.com / cleaner1@example.com / cleaner2@example.com");
  console.log(`Passwort für alle Demo-Accounts: ${DEMO_PASSWORD}`);

  const { data: template, error: templateError } = await admin
    .from("checklist_templates")
    .insert({
      org_id: org.id,
      name: "Standard-Reinigung Ferienwohnung",
      description: "Standardvorlage für die Endreinigung nach Auszug",
    })
    .select()
    .single();
  if (templateError) throw templateError;

  const items = [
    { room_name: "Küche", label: "Herd & Backofen gereinigt", position: 1 },
    { room_name: "Küche", label: "Kühlschrank geleert & gereinigt", position: 2 },
    { room_name: "Küche", label: "Geschirr gespült & verstaut", position: 3 },
    { room_name: "Bad", label: "Dusche/Wanne gereinigt", position: 1 },
    { room_name: "Bad", label: "WC gereinigt & desinfiziert", position: 2 },
    { room_name: "Bad", label: "Handtücher & Kosmetik aufgefüllt", position: 3 },
    { room_name: "Schlafzimmer", label: "Bett frisch bezogen", position: 1 },
    { room_name: "Schlafzimmer", label: "Staub gewischt", position: 2 },
    { room_name: "Flur", label: "Boden gesaugt & gewischt", position: 1 },
    { room_name: "Flur", label: "Schuhe/Garderobe aufgeräumt", position: 2 },
  ];
  const { error: itemsError } = await admin
    .from("checklist_template_items")
    .insert(items.map((i) => ({ ...i, template_id: template.id })));
  if (itemsError) throw itemsError;

  const apartments = [
    { name: "Wohnung 1 – Seeblick", address: "Seestraße 1, 83001 Musterstadt", room_count: 3 },
    { name: "Wohnung 2 – Altstadt", address: "Marktplatz 4, 83001 Musterstadt", room_count: 2 },
    { name: "Wohnung 3 – Bergblick", address: "Bergweg 7, 83001 Musterstadt", room_count: 4 },
  ];

  const apartmentIds: string[] = [];
  for (const a of apartments) {
    const { data: apt, error: aptError } = await admin
      .from("apartments")
      .insert({ ...a, org_id: org.id })
      .select()
      .single();
    if (aptError) throw aptError;
    apartmentIds.push(apt.id);

    await admin.from("apartment_checklist_templates").insert({
      apartment_id: apt.id,
      template_id: template.id,
    });

    await admin.from("apartment_inventory_items").insert([
      { apartment_id: apt.id, name: "Fernbedienung TV", category: "Elektronik" },
      { apartment_id: apt.id, name: "Kaffeemaschine", category: "Küche" },
      { apartment_id: apt.id, name: "Bügeleisen", category: "Sonstiges" },
    ]);
  }
  console.log("Wohnungen angelegt:", apartments.map((a) => a.name).join(", "));

  const jobs = [
    { apartment_id: apartmentIds[0], assigned_to: cleaner1Id, scheduled_date: todayPlus(0), status: "scheduled" },
    { apartment_id: apartmentIds[1], assigned_to: cleaner2Id, scheduled_date: todayPlus(0), status: "scheduled" },
    { apartment_id: apartmentIds[2], assigned_to: cleaner1Id, scheduled_date: todayPlus(2), status: "scheduled" },
  ];
  for (const j of jobs) {
    const { error: jobError } = await admin.from("cleaning_jobs").insert({
      org_id: org.id,
      checklist_template_id: template.id,
      created_by: adminId,
      ...j,
    });
    if (jobError) throw jobError;
  }
  console.log("Reinigungsaufträge angelegt.");

  console.log("\nFertig. Login-Daten:");
  console.log(`  Admin:    admin@example.com / ${DEMO_PASSWORD}`);
  console.log(`  Cleaner:  cleaner1@example.com / ${DEMO_PASSWORD}`);
  console.log(`  Cleaner:  cleaner2@example.com / ${DEMO_PASSWORD}`);
}

main().catch((err) => {
  console.error("Seed fehlgeschlagen:", err);
  process.exit(1);
});
