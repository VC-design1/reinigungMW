-- ============================================================================
-- Superadmin + Account-Löschung
--
-- 1) is_superadmin-Flag: genau ein ausgezeichneter Admin (der Inhaber) darf
--    fremde Admin-Profile verwalten und Admin-Accounts löschen. Das Flag ist
--    bewusst NICHT über die App setzbar — nur per SQL/Migration.
-- 2) Historien-FKs entschärft: Verweise auf gelöschte Accounts werden auf
--    NULL gesetzt, statt das Löschen zu blockieren. Reinigungshistorie,
--    Fotos und Meldungen bleiben vollständig erhalten.
-- ============================================================================

alter table public.profiles
  add column if not exists is_superadmin boolean not null default false;

-- Inhaber-Account als Superadmin markieren
update public.profiles
  set is_superadmin = true
  where email = 'm.haehling@value-circle.de';

create or replace function public.is_superadmin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce((select is_superadmin from public.profiles where id = auth.uid()), false);
$$;

-- profiles-Update-Policy: Admins verwalten Nicht-Admin-Profile und sich
-- selbst; der Superadmin zusätzlich fremde Admin-Profile. Das Superadmin-
-- Profil selbst kann weiterhin nur sein Inhaber ändern.
drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (
    org_id = public.current_org_id()
    and public.is_admin()
    and (id = auth.uid() or role <> 'admin' or public.is_superadmin())
    and (id = auth.uid() or not is_superadmin)
  )
  with check (
    org_id = public.current_org_id()
    and public.is_admin()
    and (id = auth.uid() or role <> 'admin' or public.is_superadmin())
    and (id = auth.uid() or not is_superadmin)
  );

-- ----------------------------------------------------------------------------
-- FKs: Löschen eines Accounts darf die Historie nicht blockieren/löschen
-- ----------------------------------------------------------------------------

alter table public.cleaning_jobs alter column created_by drop not null;
alter table public.cleaning_jobs drop constraint cleaning_jobs_created_by_fkey;
alter table public.cleaning_jobs
  add constraint cleaning_jobs_created_by_fkey
  foreign key (created_by) references public.profiles (id) on delete set null;

alter table public.photos alter column uploaded_by drop not null;
alter table public.photos drop constraint photos_uploaded_by_fkey;
alter table public.photos
  add constraint photos_uploaded_by_fkey
  foreign key (uploaded_by) references public.profiles (id) on delete set null;

alter table public.issue_reports alter column reported_by drop not null;
alter table public.issue_reports drop constraint issue_reports_reported_by_fkey;
alter table public.issue_reports
  add constraint issue_reports_reported_by_fkey
  foreign key (reported_by) references public.profiles (id) on delete set null;

alter table public.cleaning_ratings alter column rated_by drop not null;
alter table public.cleaning_ratings drop constraint cleaning_ratings_rated_by_fkey;
alter table public.cleaning_ratings
  add constraint cleaning_ratings_rated_by_fkey
  foreign key (rated_by) references public.profiles (id) on delete set null;
