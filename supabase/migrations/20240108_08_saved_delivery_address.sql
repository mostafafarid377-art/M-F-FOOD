-- One optional saved delivery address per customer. Existing orders remain
-- immutable snapshots; saving or deleting an address does not alter them.
create table public.customer_saved_addresses (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null unique references auth.users(id) on delete cascade,
  building text not null check (length(btrim(building)) between 1 and 160),
  apartment text not null default '' check (length(apartment) <= 80),
  floor text not null default '' check (length(floor) <= 80),
  street text not null check (length(btrim(street)) between 1 and 200),
  phone text not null check (length(btrim(phone)) between 7 and 30 and length(regexp_replace(phone, '[^0-9٠-٩۰-۹]', '', 'g')) >= 7),
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180)
);
alter table public.customer_saved_addresses enable row level security;
revoke all on public.customer_saved_addresses from public, anon, authenticated;
grant select, insert, update, delete on public.customer_saved_addresses to authenticated;
create policy saved_address_select on public.customer_saved_addresses for select to authenticated using (customer_id = auth.uid());
create policy saved_address_insert on public.customer_saved_addresses for insert to authenticated with check (customer_id = auth.uid());
create policy saved_address_update on public.customer_saved_addresses for update to authenticated using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy saved_address_delete on public.customer_saved_addresses for delete to authenticated using (customer_id = auth.uid());
