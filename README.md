# Reinigungsmanagement für Ferienwohnungen

Full-Stack-Web-App mit zwei Rollen — **Reinigungskraft** und **Vermieter/Admin** —
für Reinigungsaufträge, raumweise Checklisten, Foto-Dokumentation, Schadensmeldungen,
Kalender/Kapazitätsplanung und ein Vermieter-Dashboard mit Historie, Statistiken
und Benachrichtigungen.

Phase 1 (MVP-Kern) **und** Phase 2 (Kalender/iCal, QR-Codes, PDF-Export, PWA,
Push/E-Mail, Mehrsprachigkeit, Statistik, Bewertungen u. a.) sind umgesetzt.

## Tech-Stack

- **Next.js 16 (App Router) + TypeScript** — Server Components für Datenabruf,
  Server Actions für Mutationen im Vermieter-Bereich, Client Components für den
  interaktiven Reinigungs-Workflow.
- **Supabase** (Postgres + Auth + Storage) — Row-Level-Security für Mandantenfähigkeit,
  E-Mail/Passwort-Login (Struktur ist offen für Magic-Link/SSO später).
- **Tailwind CSS** mit einer kleinen, selbst gebauten UI-Komponentenbibliothek
  (`src/components/ui`) im shadcn/ui-Stil.
- **React Hook Form + Zod** für Formulare/Validierung.
- **browser-image-compression** komprimiert Fotos vor dem Upload.
- **IndexedDB (idb-keyval)** als Offline-Draft-Queue für den Reinigungs-Bereich.
- **node-ical** für den iCal-Belegungsimport, **qrcode** für QR-Codes,
  **@react-pdf/renderer** für PDF-Zustandsberichte, **web-push** + **Resend**
  für Push-/E-Mail-Benachrichtigungen, **recharts** für die Statistik-Charts.
- **Vitest** für Unit-Tests.

## Setup

### 1. Supabase-Projekt anlegen

1. Ein kostenloses Projekt auf [supabase.com](https://supabase.com) anlegen.
2. Unter **Settings → API** die `Project URL`, den `anon public` Key und den
   `service_role` Key kopieren.
3. `.env.example` nach `.env.local` kopieren und die Werte eintragen:

   ```bash
   cp .env.example .env.local
   ```

### 2. Datenbank-Migrationen ausführen

Die SQL-Migrationen liegen in `supabase/migrations/` und müssen **in Reihenfolge**
ausgeführt werden:

- `0001_init.sql` — Phase-1-Kernschema (Wohnungen, Checklisten, Aufträge, Fotos,
  Meldungen, Benachrichtigungen, RLS, Storage-Bucket).
- `0002_phase2.sql` — Phase-2-Ergänzungen (`apartment_bookings` für iCal-Import,
  `push_subscriptions`, `cleaning_ratings`, neuer Notification-Typ `cleaning_reminder`).
- `0003_roles.sql` — Rollenkonzept v2 (Rolle `landlord`, Wohnungs-Zuordnung
  `owner_id`, Stamm-Reinigungskraft `default_cleaner_id`, Auftrag↔Buchung-
  Verknüpfung für die automatische Abreise-Reinigung, verschärfte RLS).
- `0004_superadmin.sql` — Superadmin-Flag (Inhaber-Account, per E-Mail in der
  Migration gesetzt) + Account-Löschung: Historien-FKs auf `on delete set null`,
  damit Accounts gelöscht werden können, ohne Aufträge/Fotos/Meldungen zu
  verlieren.

Zwei Wege, sie auszuführen:

- **Dashboard**: Inhalt der jeweiligen Datei in den SQL-Editor im Supabase-Dashboard
  einfügen und ausführen (0001 zuerst, dann 0002, dann 0003).
- **Supabase-CLI**: `supabase link` gegen dein Projekt, dann `supabase db push`.

### 3. Dependencies installieren, Icons generieren, Demo-Daten seeden

```bash
npm install
npm run icons   # generiert public/icons/*.png (PWA-Icons) aus einem SVG
npm run seed
```

Das Seed-Skript legt eine Beispiel-Organisation, drei Demo-Accounts, eine
Checklisten-Vorlage, drei Wohnungen und ein paar Reinigungsaufträge an:

| Rolle          | E-Mail                | Passwort     |
| -------------- | ---------------------- | ------------ |
| Admin/Vermieter | admin@example.com      | `Demo1234!`  |
| Reinigungskraft | cleaner1@example.com   | `Demo1234!`  |
| Reinigungskraft | cleaner2@example.com   | `Demo1234!`  |

### 4. Optional: Push-Benachrichtigungen, E-Mail, Cron-Erinnerungen

Diese drei sind optional — die App funktioniert vollständig ohne sie (in-app-
Benachrichtigungen laufen immer):

- **Web-Push**: eigenes VAPID-Schlüsselpaar erzeugen und in `.env.local` eintragen:
  ```bash
  npx web-push generate-vapid-keys
  ```
  → `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` befüllen.
- **E-Mail**: `RESEND_API_KEY` (+ optional `RESEND_FROM_EMAIL`) von
  [resend.com](https://resend.com) eintragen. Ohne Key wird E-Mail-Versand
  übersprungen (no-op).
- **Automatische Erinnerungen**: `CRON_SECRET` auf einen zufälligen Wert setzen
  und `/api/cron/reminders` täglich extern triggern lassen (z. B. via Vercel Cron,
  siehe `vercel.json` — sendet einen `Authorization: Bearer $CRON_SECRET`-Header).
  Ohne externen Scheduler passiert hier einfach nichts; alle anderen
  Benachrichtigungen (Reinigung abgeschlossen, Problem gemeldet) sind davon
  unabhängig und laufen sofort event-basiert.

### 5. Entwicklungsserver starten

```bash
npm run dev
```

App unter [http://localhost:3000](http://localhost:3000) öffnen — Login leitet
automatisch in den passenden Bereich (`/clean` bzw. `/admin`) weiter.

## Weitere Befehle

```bash
npm run build      # Produktions-Build
npm run lint        # ESLint
npx tsc --noEmit    # Type-Check
npm run test         # Vitest (einmalig)
npm run test:watch  # Vitest im Watch-Modus
npm run icons        # PWA-Icons neu generieren
```

## Projektstruktur

```
src/
  app/
    login/            Login-Seite
    offline/           PWA-Offline-Fallback-Seite
    clean/             Reinigungspersonal-Bereich (mobile-first, DE/EN)
      jobs/[jobId]/    Checkliste, Fotos, Meldungen, Statuswechsel
      scan/[apartmentId]/   Ziel des QR-Code-Scans vor Ort
    admin/             Vermieter-Bereich (responsive)
      apartments/      Wohnungs-CRUD, Inventar, QR-Code, Buchungen (manuell + iCal), PDF-Bericht, Historie
      templates/       Checklisten-Vorlagen-CRUD
      jobs/            Reinigungsaufträge anlegen/zuweisen
      calendar/        Monatskalender, Kapazitäten, Belegung
      team/            Reinigungskräfte anlegen/deaktivieren, Ø-Bewertung
      stats/           Statistik-Dashboard (Auslastung, Dauer, Schadensquote)
      insights/        Wiederkehrende Schadens-/Inventar-Meldungen
      notifications/   In-App-Benachrichtigungen
    api/
      notify/          Erzeugt in-app/Push/E-Mail-Benachrichtigungen für Admins
      cron/reminders/  Tägliche Erinnerung an Reinigungskräfte (extern getriggert)
      push/subscribe/  Web-Push-Subscription verwalten
      apartments/[id]/report/   PDF-Zustandsbericht
  components/ui/       Kleine Tailwind-UI-Bibliothek (Button, Card, Input, …)
  lib/
    supabase/          Browser-/Server-/Admin-Clients + Proxy(Middleware)-Session-Refresh
    offline/           IndexedDB-Queue + Sync-Logik für den Reinigungs-Bereich
    jobs/mutations.ts  Alle Supabase-Mutationen für den Reinigungs-Workflow
    i18n/              DE/EN-Dictionaries für den Reinigungs-Bereich
    ical/sync.ts        iCal-Feed-Parsing → apartment_bookings
    pdf/                 PDF-Zustandsbericht (React-PDF)
    push/, email/        Web-Push- und E-Mail-Versand (best-effort, no-op ohne Config)
    validation/        Zod-Schemas
supabase/migrations/    SQL-Schema, RLS-Policies, Trigger, Storage-Bucket
scripts/
  seed.ts               Demo-Daten-Skript
  generate-icons.mjs    PWA-Icon-Generator
public/
  sw.js                  Service Worker (App-Shell-Caching, Offline-Fallback, Push)
  manifest.json          PWA-Manifest
vercel.json               Cron-Konfiguration für /api/cron/reminders
```

## Wie die Offline-Toleranz funktioniert

Checklisten-Updates, Foto-Uploads, Statuswechsel und Schadensmeldungen versuchen
zunächst einen direkten Supabase-Call (`src/lib/jobs/mutations.ts`). Schlägt der
Call wegen fehlender Verbindung fehl, wird die Aktion in einer IndexedDB-Queue
zwischengespeichert (`src/lib/offline/queue.ts`) und die UI aktualisiert sich
trotzdem optimistisch. Ein `SyncStatusBadge` im Header des Reinigungs-Bereichs
zeigt den Online-/Sync-Status und flusht die Queue automatisch, sobald wieder
eine Verbindung besteht (Event `online`, periodisches Polling alle 30s).

Der Service Worker (`public/sw.js`) ergänzt das um App-Shell-Caching (die App
lädt beim zweiten Besuch auch offline) und eine `/offline`-Fallback-Seite für
noch nicht gecachte Navigationen — die eigentliche Formulardaten-Synchronisierung
läuft aber weiterhin über die IndexedDB-Queue, nicht über den Service Worker.

## Rollenkonzept

| Rolle | Sichtbarkeit | Rechte |
| --- | --- | --- |
| **Admin** | alles in der Organisation | Wohnungen/Vorlagen/Team/Aufträge/Buchungen verwalten, Profile bearbeiten |
| **Vermieter** (`landlord`) | nur Wohnungen mit eigener Zuordnung (`owner_id`) | Buchungen eintragen/löschen, Reinigungsaufträge anlegen, geplante Aufträge löschen, PDF-Bericht; alles andere read-only |
| **Reinigungskraft** (`cleaner`) | nur Wohnungen mit ihr zugewiesenen Aufträgen | Checklisten/Fotos/Meldungen/Status im eigenen Auftrag |

Schutzregeln für Profile: Ein Admin kann Vermieter- und Reinigungskraft-Profile
bearbeiten, deaktivieren und **löschen** — fremde Admin-Profile aber nicht:
Jeder Admin-Account gehört seinem Inhaber (per Server-Check *und* RLS-Policy
erzwungen). Ausnahme ist der **Superadmin** (Inhaber-Account, Flag
`profiles.is_superadmin`, nur per SQL/Migration setzbar — siehe
`0004_superadmin.sql`): Er darf zusätzlich fremde Admin-Profile verwalten und
Admin-Accounts löschen. Das Superadmin-Profil selbst ist unlöschbar und nur vom
Inhaber änderbar. Beim Löschen eines Accounts bleibt die Reinigungshistorie
vollständig erhalten (Verweise auf die Person werden auf NULL gesetzt).
Bestehende Profile können nicht nachträglich zu Admins hochgestuft werden; neue
Admins entstehen nur über „Neues Teammitglied anlegen". Die eigene Rolle ist
nicht änderbar (verhindert, dass sich der letzte Admin selbst aussperrt).

## Automatische Abreise-Reinigung

Endet ein Vermietungszeitraum, wird automatisch ein Reinigungsauftrag für den
Abreisetag angelegt — sowohl beim manuellen Eintragen einer Buchung als auch
beim iCal-Import (`src/lib/bookings/auto-clean.ts`). Ist an der Wohnung eine
**Stamm-Reinigungskraft** hinterlegt, wird der Auftrag ihr zugewiesen und sie
per In-App-Benachrichtigung (plus Push/E-Mail, falls konfiguriert) informiert;
sonst bleibt er unzugewiesen und erscheint beim Admin unter „Aufträge". Pro
Buchung entsteht höchstens ein Auto-Auftrag (Verknüpfung über
`cleaning_jobs.booking_id`), auch wenn der iCal-Sync mehrfach läuft.

## Schadens-Eskalation

Meldungen der Kategorie „Schaden" oder „Reinigung nicht möglich" gelten
automatisch als **kritisch** und lösen sofort eine Push-/E-Mail-Benachrichtigung
an alle Admins sowie den zugeordneten Vermieter der Wohnung aus (zusätzlich zur
In-App-Benachrichtigung); der Auftragsstatus
springt auf „Problem gemeldet". Alle anderen Kategorien gelten als **normal** und
erscheinen nur in-app, gesammelt im Dashboard unter „Offene Meldungen" — kein
Push-/E-Mail-Spam für Kleinigkeiten. Priorität kann aktuell nicht manuell von
einem Admin nachträglich hochgestuft werden (mögliche Erweiterung).

## Sicherheitshinweise

- `SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `RESEND_API_KEY` und
  `CRON_SECRET` niemals im Client verwenden oder committen — sie werden
  ausschließlich in Server-only-Code gelesen (`src/lib/supabase/admin.ts`,
  API-Routen, `scripts/seed.ts`).
- Alle Tabellen haben Row-Level-Security aktiviert; Zugriffe sind strikt auf die
  eigene Organisation (`org_id`) beschränkt, siehe `supabase/migrations/*.sql`.
- `/api/cron/reminders` prüft den `Authorization: Bearer $CRON_SECRET`-Header und
  antwortet ohne gültiges Secret mit 401/500.

## Nicht umgesetzt / mögliche Erweiterungen

- Vollständige Offline-Installierbarkeit ist auf App-Shell-Ebene vorhanden;
  ein Update-Prompt bei neuer Service-Worker-Version fehlt noch.
- Push-Subscriptions werden nicht automatisch bereinigt, wenn sie clientseitig
  ablaufen (410/404 vom Push-Dienst) — für Produktivbetrieb empfehlenswert.
- Manuelle Nach-Eskalation einer als „normal" eingestuften Meldung durch den
  Admin ist nicht möglich (nur die automatische Kategorie-Regel).
- Buchungsimport unterstützt nur iCal-Lesezugriff (kein Zwei-Wege-Sync mit
  Airbnb/Booking); manuelle Buchungen lassen sich auf der Wohnungs-Detailseite
  unter „Belegung &amp; Buchungen" eintragen und löschen.
