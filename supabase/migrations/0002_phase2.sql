-- ============================================================================
-- Phase 2 additions: iCal-Belegungsimport, Push-Subscriptions, Bewertungen,
-- Erinnerungs-Notification-Typ.
-- ============================================================================

alter table public.apartments
  add column if not exists ical_url text;

-- ----------------------------------------------------------------------------
-- Belegungen aus externen Kalendern (Airbnb/Booking iCal-Feeds)
-- ----------------------------------------------------------------------------

create table public.apartment_bookings (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  uid text not null,
  start_date date not null,
  end_date date not null,
  summary text,
  source text not null default 'ical',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (apartment_id, uid)
);

create index apartment_bookings_apartment_id_idx on public.apartment_bookings (apartment_id);
create index apartment_bookings_dates_idx on public.apartment_bookings (start_date, end_date);

create trigger apartment_bookings_set_updated_at
  before update on public.apartment_bookings
  for each row execute function public.set_updated_at();

alter table public.apartment_bookings enable row level security;

create policy apartment_bookings_select on public.apartment_bookings
  for select using (org_id = public.current_org_id());

create policy apartment_bookings_write_admin on public.apartment_bookings
  for all using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

-- ----------------------------------------------------------------------------
-- Web-Push-Subscriptions
-- ----------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index push_subscriptions_profile_id_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

create policy push_subscriptions_own on public.push_subscriptions
  for all using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Sternebewertung abgeschlossener Reinigungen (durch den Vermieter)
-- ----------------------------------------------------------------------------

create table public.cleaning_ratings (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null unique references public.cleaning_jobs (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  cleaner_id uuid references public.profiles (id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  comment text,
  rated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index cleaning_ratings_cleaner_id_idx on public.cleaning_ratings (cleaner_id);

alter table public.cleaning_ratings enable row level security;

create policy cleaning_ratings_select on public.cleaning_ratings
  for select using (
    org_id = public.current_org_id()
    and (public.is_admin() or cleaner_id = auth.uid())
  );

create policy cleaning_ratings_write_admin on public.cleaning_ratings
  for all using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

-- ----------------------------------------------------------------------------
-- Neuer Benachrichtigungstyp für automatische Erinnerungen
-- ----------------------------------------------------------------------------

alter table public.notifications drop constraint notifications_type_check;
alter table public.notifications add constraint notifications_type_check
  check (type in ('cleaning_completed', 'issue_reported', 'cleaning_overdue', 'cleaning_reminder'));
