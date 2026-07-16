-- ============================================================================
-- Reinigungsmanagement — initial schema, Phase 1 (MVP)
-- Run via `supabase db push` / `supabase migration up`, or paste into the
-- Supabase Dashboard SQL editor. Safe to run once against a fresh project.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- Tables
-- ----------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  role text not null check (role in ('admin', 'cleaner')),
  full_name text not null,
  email text not null,
  phone text,
  locale text not null default 'de',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index profiles_org_id_idx on public.profiles (org_id);

create table public.apartments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  address text not null,
  room_count integer not null default 1,
  description text,
  floor_plan_url text,
  status text not null default 'active' check (status in ('active', 'archived')),
  occupancy_status text not null default 'free' check (occupancy_status in ('free', 'occupied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index apartments_org_id_idx on public.apartments (org_id);

create table public.apartment_inventory_items (
  id uuid primary key default gen_random_uuid(),
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  name text not null,
  category text,
  notes text
);

create index apartment_inventory_items_apartment_id_idx on public.apartment_inventory_items (apartment_id);

create table public.checklist_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);

create index checklist_templates_org_id_idx on public.checklist_templates (org_id);

create table public.checklist_template_items (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  room_name text not null,
  position integer not null default 0,
  label text not null
);

create index checklist_template_items_template_id_idx on public.checklist_template_items (template_id);

create table public.apartment_checklist_templates (
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  template_id uuid not null references public.checklist_templates (id) on delete cascade,
  primary key (apartment_id, template_id)
);

create table public.cleaning_jobs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  assigned_to uuid references public.profiles (id) on delete set null,
  checklist_template_id uuid references public.checklist_templates (id) on delete set null,
  scheduled_date date not null,
  scheduled_start time,
  scheduled_end time,
  status text not null default 'scheduled' check (status in ('scheduled', 'in_progress', 'completed', 'problem_reported')),
  started_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index cleaning_jobs_org_id_idx on public.cleaning_jobs (org_id);
create index cleaning_jobs_apartment_id_idx on public.cleaning_jobs (apartment_id);
create index cleaning_jobs_assigned_to_idx on public.cleaning_jobs (assigned_to);
create index cleaning_jobs_scheduled_date_idx on public.cleaning_jobs (scheduled_date);

create table public.cleaning_job_checklist_results (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  room_name text not null,
  label text not null,
  checked boolean not null default false,
  note text,
  created_at timestamptz not null default now()
);

create index cleaning_job_checklist_results_job_id_idx on public.cleaning_job_checklist_results (cleaning_job_id);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  room_name text not null,
  phase text not null check (phase in ('before', 'after', 'issue')),
  storage_path text not null,
  uploaded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index photos_job_id_idx on public.photos (cleaning_job_id);

create table public.issue_reports (
  id uuid primary key default gen_random_uuid(),
  cleaning_job_id uuid not null references public.cleaning_jobs (id) on delete cascade,
  apartment_id uuid not null references public.apartments (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  category text not null check (category in ('damage', 'wear', 'missing_item', 'cleaning_not_possible', 'other')),
  description text not null,
  priority text not null default 'normal' check (priority in ('critical', 'normal')),
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  reported_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index issue_reports_job_id_idx on public.issue_reports (cleaning_job_id);
create index issue_reports_apartment_id_idx on public.issue_reports (apartment_id);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  type text not null check (type in ('cleaning_completed', 'issue_reported', 'cleaning_overdue')),
  title text not null,
  body text,
  related_job_id uuid references public.cleaning_jobs (id) on delete cascade,
  related_apartment_id uuid references public.apartments (id) on delete cascade,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id);

-- ----------------------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------------------

create function public.set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger apartments_set_updated_at
  before update on public.apartments
  for each row execute function public.set_updated_at();

create trigger cleaning_jobs_set_updated_at
  before update on public.cleaning_jobs
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- new-user → profile trigger
-- Expects auth.users.raw_user_meta_data to contain org_id, role, full_name.
-- Set via supabase.auth.admin.createUser({ user_metadata: {...} }) server-side.
-- ----------------------------------------------------------------------------

create function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, org_id, role, full_name, email, phone, locale)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'org_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'role', 'cleaner'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'locale', 'de')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- RLS helper functions (security definer to avoid recursive RLS lookups)
-- ----------------------------------------------------------------------------

create function public.current_org_id() returns uuid
  language sql stable security definer set search_path = public as $$
  select org_id from public.profiles where id = auth.uid();
$$;

create function public.current_role() returns text
  language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- ----------------------------------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.apartments enable row level security;
alter table public.apartment_inventory_items enable row level security;
alter table public.checklist_templates enable row level security;
alter table public.checklist_template_items enable row level security;
alter table public.apartment_checklist_templates enable row level security;
alter table public.cleaning_jobs enable row level security;
alter table public.cleaning_job_checklist_results enable row level security;
alter table public.photos enable row level security;
alter table public.issue_reports enable row level security;
alter table public.notifications enable row level security;

-- organizations: members can read their own org
create policy organizations_select on public.organizations
  for select using (id = public.current_org_id());

-- profiles: members can read profiles in their org; admins manage profiles in their org;
-- users can update their own row (name/phone/locale — enforced at the app layer)
create policy profiles_select on public.profiles
  for select using (org_id = public.current_org_id());

create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

create policy profiles_update_admin on public.profiles
  for update using (org_id = public.current_org_id() and public.is_admin());

-- apartments: org members can read; only admins write
create policy apartments_select on public.apartments
  for select using (org_id = public.current_org_id());

create policy apartments_write_admin on public.apartments
  for all using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

-- inventory items: follow parent apartment's org
create policy inventory_select on public.apartment_inventory_items
  for select using (
    apartment_id in (select id from public.apartments where org_id = public.current_org_id())
  );

create policy inventory_write_admin on public.apartment_inventory_items
  for all using (
    public.is_admin() and apartment_id in (select id from public.apartments where org_id = public.current_org_id())
  )
  with check (
    public.is_admin() and apartment_id in (select id from public.apartments where org_id = public.current_org_id())
  );

-- checklist templates: org members can read; only admins write
create policy checklist_templates_select on public.checklist_templates
  for select using (org_id = public.current_org_id());

create policy checklist_templates_write_admin on public.checklist_templates
  for all using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

create policy checklist_template_items_select on public.checklist_template_items
  for select using (
    template_id in (select id from public.checklist_templates where org_id = public.current_org_id())
  );

create policy checklist_template_items_write_admin on public.checklist_template_items
  for all using (
    public.is_admin() and template_id in (select id from public.checklist_templates where org_id = public.current_org_id())
  )
  with check (
    public.is_admin() and template_id in (select id from public.checklist_templates where org_id = public.current_org_id())
  );

create policy apartment_checklist_templates_select on public.apartment_checklist_templates
  for select using (
    apartment_id in (select id from public.apartments where org_id = public.current_org_id())
  );

create policy apartment_checklist_templates_write_admin on public.apartment_checklist_templates
  for all using (
    public.is_admin() and apartment_id in (select id from public.apartments where org_id = public.current_org_id())
  )
  with check (
    public.is_admin() and apartment_id in (select id from public.apartments where org_id = public.current_org_id())
  );

-- cleaning_jobs: admins see/manage all jobs in their org; cleaners see/update only their own assignments
create policy cleaning_jobs_select on public.cleaning_jobs
  for select using (
    org_id = public.current_org_id()
    and (public.is_admin() or assigned_to = auth.uid())
  );

create policy cleaning_jobs_write_admin on public.cleaning_jobs
  for all using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

create policy cleaning_jobs_update_assignee on public.cleaning_jobs
  for update using (org_id = public.current_org_id() and assigned_to = auth.uid())
  with check (org_id = public.current_org_id() and assigned_to = auth.uid());

-- checklist results: same org, admin or the assigned cleaner of the parent job
create policy checklist_results_select on public.cleaning_job_checklist_results
  for select using (org_id = public.current_org_id());

create policy checklist_results_write on public.cleaning_job_checklist_results
  for all using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
    )
  )
  with check (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
    )
  );

-- photos: same pattern as checklist results
create policy photos_select on public.photos
  for select using (org_id = public.current_org_id());

create policy photos_write on public.photos
  for all using (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
    )
  )
  with check (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
    )
  );

-- issue reports: cleaners can create/read for their own jobs; admins can read/update all in org
create policy issue_reports_select on public.issue_reports
  for select using (org_id = public.current_org_id());

create policy issue_reports_insert on public.issue_reports
  for insert with check (
    org_id = public.current_org_id()
    and (
      public.is_admin()
      or cleaning_job_id in (select id from public.cleaning_jobs where assigned_to = auth.uid())
    )
  );

create policy issue_reports_update_admin on public.issue_reports
  for update using (org_id = public.current_org_id() and public.is_admin())
  with check (org_id = public.current_org_id() and public.is_admin());

-- notifications: users read/update (mark read) only their own; inserts happen server-side
-- via the service-role key (bypasses RLS), so no insert policy is granted here.
create policy notifications_select on public.notifications
  for select using (user_id = auth.uid());

create policy notifications_update_self on public.notifications
  for update using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- Storage bucket for cleaning photos / floor plans
-- ----------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('cleaning-photos', 'cleaning-photos', false)
on conflict (id) do nothing;

-- Path convention: `${org_id}/${cleaning_job_id}/${filename}` so RLS can check
-- the org_id path segment against the caller's org.
create policy cleaning_photos_select on storage.objects
  for select using (
    bucket_id = 'cleaning-photos'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );

create policy cleaning_photos_insert on storage.objects
  for insert with check (
    bucket_id = 'cleaning-photos'
    and (storage.foldername(name))[1] = public.current_org_id()::text
  );
