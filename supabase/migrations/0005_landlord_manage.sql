-- ============================================================================
-- Vermieter-Selbstverwaltung:
--  1) Vermieter dürfen eigene Wohnungen anlegen und verwalten (Inventar,
--     Checklisten-Zuordnung, Archivieren, iCal) — owner_id ist dabei immer
--     der Vermieter selbst.
--  2) Vermieter dürfen eigene Reinigungskräfte anlegen und verwalten:
--     profiles.managed_by verweist auf den Vermieter, der die Reinigungskraft
--     angelegt hat. Admins verwalten weiterhin alle.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Reinigungskraft → verwaltender Vermieter
-- ----------------------------------------------------------------------------

alter table public.profiles
  add column if not exists managed_by uuid references public.profiles (id) on delete set null;

create index if not exists profiles_managed_by_idx on public.profiles (managed_by);

-- Signup-Trigger übernimmt managed_by aus den User-Metadaten
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, org_id, role, full_name, email, phone, locale, managed_by)
  values (
    new.id,
    (new.raw_user_meta_data ->> 'org_id')::uuid,
    coalesce(new.raw_user_meta_data ->> 'role', 'cleaner'),
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    new.raw_user_meta_data ->> 'phone',
    coalesce(new.raw_user_meta_data ->> 'locale', 'de'),
    (new.raw_user_meta_data ->> 'managed_by')::uuid
  );
  return new;
end;
$$;

-- Vermieter dürfen die eigenen Reinigungskräfte (managed_by = sie selbst)
-- bearbeiten und deaktivieren; die Rolle bleibt dabei 'cleaner'.
create policy profiles_update_landlord on public.profiles
  for update using (
    org_id = public.current_org_id()
    and public.is_landlord()
    and role = 'cleaner'
    and managed_by = auth.uid()
  )
  with check (
    org_id = public.current_org_id()
    and public.is_landlord()
    and role = 'cleaner'
    and managed_by = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- Wohnungen: Vermieter legen eigene Wohnungen an und verwalten deren
-- Inventar und Checklisten-Zuordnung
-- ----------------------------------------------------------------------------

create policy apartments_insert_landlord on public.apartments
  for insert with check (
    org_id = public.current_org_id()
    and public.is_landlord()
    and owner_id = auth.uid()
  );

create policy inventory_write_landlord on public.apartment_inventory_items
  for all using (
    public.is_landlord()
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  )
  with check (
    public.is_landlord()
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  );

create policy apartment_checklist_templates_write_landlord on public.apartment_checklist_templates
  for all using (
    public.is_landlord()
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  )
  with check (
    public.is_landlord()
    and apartment_id in (select id from public.apartments where owner_id = auth.uid())
  );
