-- ============================================================================
-- Rollenkonzept v2:
--   admin    — verwaltet alles in der Organisation
--   landlord — Vermieter: sieht nur eigene Wohnungen, darf dort Buchungen und
--              Reinigungsaufträge anlegen
--   cleaner  — Reinigungskraft: sieht nur Wohnungen mit ihr zugewiesenen
--              Aufträgen
-- Außerdem: Stamm-Reinigungskraft pro Wohnung, Verknüpfung Auftrag↔Buchung
-- für die automatische Abreise-Reinigung, und Schutz von Admin-Profilen
-- (nur der Inhaber selbst darf sein Admin-Profil ändern/deaktivieren).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Schema-Erweiterungen
-- ----------------------------------------------------------------------------

alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'landlord', 'cleaner'));

alter table public.apartments
  add column if not exists owner_id uuid references public.profiles (id) on delete set null,
  add column if not exists default_cleaner_id uuid references public.profiles (id) on delete set null;

create index if not exists apartments_owner_id_idx on public.apartments (owner_id);

-- Verknüpft automatisch erzeugte Reinigungsaufträge mit der auslösenden
-- Buchung (Deduplizierung: pro Buchung höchstens ein Auto-Auftrag).
alter table public.cleaning_jobs
  add column if not exists booking_id uuid unique references public.apartment_bookings (id) on delete set null;

-- ----------------------------------------------------------------------------
-- RLS-Helper
-- ----------------------------------------------------------------------------

create or replace function public.is_landlord() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() = 'landlord', false);
$$;

-- Wohnungen, für die die aktuelle Reinigungskraft mindestens einen Auftrag hat
create or replace function public.cleaner_apartment_ids() returns setof uuid
  language sql stable security definer set search_path = public as $$
  select distinct apartment_id from public.cleaning_jobs where assigned_to = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- profiles: Admin-Profile sind vor fremden Admins geschützt
-- ----------------------------------------------------------------------------

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (
    org_id = public.current_org_id()
    and public.is_admin()
    and (id = auth.uid() or role <> 'admin')
  )
  with check (
    org_id = public.current_org_id()
    and public.is_admin()
    -- verhindert zugleich, fremde Profile auf 'admin' zu eskalieren
    and (id = auth.uid() or role <> 'admin')
  );

-- ----------------------------------------------------------------------------
-- apartments: Sichtbarkeit nach Rolle
-- ----------------------------------------------------------------------------

drop policy if exists apartments_select on public.apartments;
create policy apartments_select on public.apartments
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or owner_id = auth.uid()
      or id in (select public.cleaner_apartment_ids())
    )
  );

-- ----------------------------------------------------------------------------
-- cleaning_jobs: Vermieter sieht Aufträge eigener Wohnungen und darf dort
-- Aufträge anlegen sowie noch nicht begonnene löschen
-- ----------------------------------------------------------------------------

drop policy if exists cleaning_jobs_select on public.cleaning_jobs;
create policy cleaning_jobs_select on public.cleaning_jobs
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or assigned_to = auth.uid()
      or apartment_id in (select id from public.apartments where owner_id = auth.uid())
    )
  );

create policy cleaning_jobs_insert_landlord on public.cleaning_jobs
  for insert with check (
    org_id = public.current_org_id()
    and public.is_landlord()
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  );

create policy cleaning_jobs_delete_landlord on public.cleaning_jobs
  for delete using (
    org_id = public.current_org_id()
    and public.is_landlord()
    and status = 'scheduled'
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- apartment_bookings: Vermieter verwaltet Buchungen eigener Wohnungen;
-- Sichtbarkeit ebenfalls auf eigene/zugewiesene Wohnungen beschränkt
-- ----------------------------------------------------------------------------

drop policy if exists apartment_bookings_select on public.apartment_bookings;
create policy apartment_bookings_select on public.apartment_bookings
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or apartment_id in (select id from public.apartments where owner_id = auth.uid())
      or apartment_id in (select public.cleaner_apartment_ids())
    )
  );

create policy apartment_bookings_write_landlord on public.apartment_bookings
  for all using (
    org_id = public.current_org_id()
    and public.is_landlord()
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  )
  with check (
    org_id = public.current_org_id()
    and public.is_landlord()
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  );

-- Vermieter darf den Belegungsstatus eigener Wohnungen aktualisieren
-- (wird beim Eintragen/Löschen von Buchungen automatisch neu berechnet)
create policy apartments_update_landlord on public.apartments
  for update using (org_id = public.current_org_id() and owner_id = auth.uid())
  with check (org_id = public.current_org_id() and owner_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Ergebnisdaten (Checklisten, Fotos, Meldungen, Bewertungen): Vermieter sieht
-- sie für eigene Wohnungen; Reinigungskräfte weiterhin nur für eigene Aufträge
-- ----------------------------------------------------------------------------

drop policy if exists checklist_results_select on public.cleaning_job_checklist_results;
create policy checklist_results_select on public.cleaning_job_checklist_results
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
      or cleaning_job_id in (
        select j.id from public.cleaning_jobs j
        join public.apartments a on a.id = j.apartment_id
        where a.owner_id = auth.uid()
      )
    )
  );

drop policy if exists photos_select on public.photos;
create policy photos_select on public.photos
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
      or cleaning_job_id in (
        select j.id from public.cleaning_jobs j
        join public.apartments a on a.id = j.apartment_id
        where a.owner_id = auth.uid()
      )
    )
  );

drop policy if exists issue_reports_select on public.issue_reports;
create policy issue_reports_select on public.issue_reports
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or reported_by = auth.uid()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
      or apartment_id in (select id from public.apartments where owner_id = auth.uid())
    )
  );

drop policy if exists cleaning_ratings_select on public.cleaning_ratings;
create policy cleaning_ratings_select on public.cleaning_ratings
  for select using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaner_id = auth.uid()
      or apartment_id in (select id from public.apartments where owner_id = auth.uid())
    )
  );
