-- Phase 5: additive tables, sessions and delivery tracking. Legacy table_sessions
-- is intentionally untouched. Monetary data and payments remain in existing tables.
create or replace function public.is_floor_staff() returns boolean language sql stable security definer set search_path=public as $$
  select public.is_manager() or exists (select 1 from public.staff_members s join public.profiles p on p.id=s.profile_id where s.profile_id=auth.uid() and p.role='staff' and s.is_active and s.role in ('server','cashier'))
$$;
revoke all on function public.is_floor_staff() from public, anon;
grant execute on function public.is_floor_staff() to authenticated;

create table if not exists public.restaurant_tables (
  id uuid primary key default uuid_generate_v4(),
  table_number integer not null unique check (table_number > 0),
  name text not null default '',
  status text not null default 'available' check(status in ('available','occupied','reserved','cleaning')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
-- Import the latest legacy table status without altering legacy records. A
-- checked-out legacy table needs cleaning; no historical session is invented.
insert into public.restaurant_tables(table_number,status)
select x.table_number, case when x.status='checked_out' then 'cleaning' else x.status end
from (select distinct on (table_number) table_number,status from public.table_sessions
      where table_number > 0 order by table_number,updated_at desc,id desc) x
on conflict (table_number) do nothing;

create table if not exists public.dining_sessions (
  id uuid primary key default uuid_generate_v4(),
  table_id uuid not null references public.restaurant_tables(id),
  opened_by uuid references public.profiles(id), closed_by uuid references public.profiles(id),
  opened_at timestamptz not null default now(), closed_at timestamptz,
  check(closed_at is null or closed_at >= opened_at)
);
create unique index if not exists one_open_dining_session_per_table on public.dining_sessions(table_id) where closed_at is null;
create table if not exists public.dining_session_orders (
  session_id uuid not null references public.dining_sessions(id),
  order_id uuid primary key references public.orders(id),
  linked_at timestamptz not null default now()
);
create index if not exists dining_session_orders_session_idx on public.dining_session_orders(session_id);

create table if not exists public.delivery_drivers (
  id uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references public.profiles(id),
  display_name text not null check (length(btrim(display_name)) > 0),
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.delivery_jobs (
  order_id uuid primary key references public.orders(id),
  driver_id uuid references public.delivery_drivers(id),
  status text not null default 'unassigned' check (status in ('unassigned','assigned','picked_up','on_the_way','delivered','cancelled')),
  assigned_at timestamptz, picked_up_at timestamptz, started_at timestamptz, delivered_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (status in ('unassigned','cancelled') or driver_id is not null)
);
create unique index if not exists one_active_delivery_per_driver on public.delivery_jobs(driver_id)
  where driver_id is not null and status in ('assigned','picked_up','on_the_way');
create index if not exists delivery_jobs_status_idx on public.delivery_jobs(status);
-- Only the latest point is retained. Delivered/cancelled/reassigned jobs delete it.
create table if not exists public.delivery_locations (
  order_id uuid primary key references public.delivery_jobs(order_id) on delete cascade,
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  updated_at timestamptz not null default now()
);
create table if not exists public.delivery_destinations (
  order_id uuid primary key references public.orders(id),
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  updated_at timestamptz not null default now()
);
create table if not exists public.restaurant_geo (
  id boolean primary key default true check(id),
  latitude double precision not null check(latitude between -90 and 90),
  longitude double precision not null check(longitude between -180 and 180),
  updated_at timestamptz not null default now()
);

create or replace function public.is_assigned_driver(p_order uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from delivery_jobs j join delivery_drivers d on d.id=j.driver_id where j.order_id=p_order and d.profile_id=auth.uid() and d.is_active and j.status in ('assigned','picked_up','on_the_way'))
$$;
-- Drivers may observe their own terminal job status so a cancellation event
-- can stop GPS immediately; coordinates remain limited to active deliveries.
create or replace function public.is_delivery_driver_record(p_order uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from delivery_jobs j join delivery_drivers d on d.id=j.driver_id where j.order_id=p_order and d.profile_id=auth.uid() and d.is_active)
$$;
revoke all on function public.is_delivery_driver_record(uuid) from public, anon;
grant execute on function public.is_delivery_driver_record(uuid) to authenticated;
revoke all on function public.is_assigned_driver(uuid) from public, anon;
grant execute on function public.is_assigned_driver(uuid) to authenticated;

alter table public.restaurant_tables enable row level security;
alter table public.dining_sessions enable row level security;
alter table public.dining_session_orders enable row level security;
alter table public.delivery_drivers enable row level security;
alter table public.delivery_jobs enable row level security;
alter table public.delivery_locations enable row level security;
alter table public.delivery_destinations enable row level security;
alter table public.restaurant_geo enable row level security;

grant select on public.restaurant_tables,public.dining_sessions,public.dining_session_orders,public.delivery_drivers,public.delivery_jobs,public.delivery_locations,public.delivery_destinations,public.restaurant_geo to authenticated;
-- Only these tables allow direct administration. Orders, sessions and GPS go via RPC.
grant insert,update on public.delivery_drivers,public.restaurant_geo to authenticated;
create policy restaurant_tables_staff_read on public.restaurant_tables for select to authenticated using(public.is_floor_staff());
create policy dining_sessions_staff_read on public.dining_sessions for select to authenticated using(public.is_floor_staff());
create policy dining_session_orders_staff_read on public.dining_session_orders for select to authenticated using(public.is_floor_staff());
create policy drivers_staff_read on public.delivery_drivers for select to authenticated using(public.is_manager() or profile_id=auth.uid());
create policy drivers_admin_insert on public.delivery_drivers for insert to authenticated with check(public.is_admin());
create policy drivers_admin_update on public.delivery_drivers for update to authenticated using(public.is_admin()) with check(public.is_admin());
create policy jobs_access on public.delivery_jobs for select to authenticated using(public.is_manager() or public.is_delivery_driver_record(order_id) or exists(select 1 from public.orders o where o.id=delivery_jobs.order_id and o.customer_id=auth.uid()));
create policy locations_access on public.delivery_locations for select to authenticated using(public.is_manager() or public.is_assigned_driver(order_id) or exists(select 1 from public.orders o join public.delivery_jobs j on j.order_id=o.id where o.id=delivery_locations.order_id and o.customer_id=auth.uid() and o.status not in ('completed','cancelled') and j.status='on_the_way'));
create policy destinations_access on public.delivery_destinations for select to authenticated using(public.is_manager() or public.is_assigned_driver(order_id) or exists(select 1 from public.orders o where o.id=delivery_destinations.order_id and o.customer_id=auth.uid()));
create policy orders_floor_read on public.orders for select to authenticated using(public.is_floor_staff() and exists(select 1 from public.dining_session_orders so where so.order_id=orders.id));
create policy order_items_floor_read on public.order_items for select to authenticated using(public.is_floor_staff() and exists(select 1 from public.dining_session_orders so where so.order_id=order_items.order_id));
create policy restaurant_geo_read on public.restaurant_geo for select to authenticated using(true);
create policy restaurant_geo_admin_insert on public.restaurant_geo for insert to authenticated with check(public.is_admin());
create policy restaurant_geo_admin_update on public.restaurant_geo for update to authenticated using(public.is_admin()) with check(public.is_admin());

drop trigger if exists set_updated_at on public.restaurant_tables;
create trigger set_updated_at before update on public.restaurant_tables for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.delivery_jobs;
create trigger set_updated_at before update on public.delivery_jobs for each row execute function public.set_updated_at();
drop trigger if exists set_updated_at on public.delivery_drivers;
create trigger set_updated_at before update on public.delivery_drivers for each row execute function public.set_updated_at();
drop trigger if exists audit_management_change on public.restaurant_tables;
create trigger audit_management_change after insert or update or delete on public.restaurant_tables for each row execute function public.audit_management_change();
drop trigger if exists audit_management_change on public.dining_sessions;
create trigger audit_management_change after insert or update or delete on public.dining_sessions for each row execute function public.audit_management_change();
drop trigger if exists audit_management_change on public.delivery_drivers;
create trigger audit_management_change after insert or update or delete on public.delivery_drivers for each row execute function public.audit_management_change();

create or replace function public.save_restaurant_table(p_id uuid,p_number integer,p_name text,p_status text,p_active boolean) returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid; v_active boolean;
begin
  if not public.is_admin() then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_number is null or p_number <= 0 or p_active is null or p_status not in ('available','reserved','cleaning') then raise exception 'invalid_table'; end if;
  if p_id is null then
    insert into restaurant_tables(table_number,name,status,is_active) values(p_number,coalesce(btrim(p_name),''),p_status,p_active) returning id into v_id;
  else
    perform 1 from restaurant_tables where id=p_id for update;
    if not found then raise exception 'table_not_found'; end if;
    select exists(select 1 from dining_sessions where table_id=p_id and closed_at is null) into v_active;
    if v_active then raise exception 'table_has_active_session'; end if;
    update restaurant_tables set table_number=p_number,name=coalesce(btrim(p_name),''),status=p_status,is_active=p_active where id=p_id returning id into v_id;
  end if;
  return v_id;
end $$;

create or replace function public.open_dining_session(p_table_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_table restaurant_tables%rowtype; v_id uuid;
begin
  if not public.is_floor_staff() then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into v_table from restaurant_tables where id=p_table_id for update;
  if not found or not v_table.is_active or v_table.status not in ('available','reserved') then raise exception 'table_unavailable'; end if;
  insert into dining_sessions(table_id,opened_by) values(p_table_id,auth.uid()) returning id into v_id;
  update restaurant_tables set status='occupied' where id=p_table_id;
  return v_id;
end $$;

create or replace function public.attach_order_to_session(p_session_id uuid,p_order_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_number integer; v_order orders%rowtype;
begin
  if not public.is_floor_staff() then raise exception 'not_authorized' using errcode='42501'; end if;
  select t.table_number into v_number from dining_sessions s join restaurant_tables t on t.id=s.table_id where s.id=p_session_id and s.closed_at is null for update of s;
  if not found then raise exception 'session_not_open'; end if;
  select * into v_order from orders where id=p_order_id for update;
  if not found or v_order.delivery_address is not null or v_order.table_number is distinct from v_number then raise exception 'order_not_for_table'; end if;
  insert into dining_session_orders(session_id,order_id) values(p_session_id,p_order_id);
end $$;

create or replace function public.close_dining_session(p_session_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_table uuid;
begin
  if not public.is_floor_staff() then raise exception 'not_authorized' using errcode='42501'; end if;
  select table_id into v_table from dining_sessions where id=p_session_id and closed_at is null for update;
  if not found then raise exception 'session_not_open'; end if;
  if exists(select 1 from dining_session_orders so join orders o on o.id=so.order_id where so.session_id=p_session_id and o.status not in ('completed','cancelled')) then raise exception 'session_has_active_orders'; end if;
  update dining_sessions set closed_at=now(),closed_by=auth.uid() where id=p_session_id;
  update restaurant_tables set status='available' where id=v_table;
end $$;

-- Link new dine-in orders to the active table session if one exists; existing
-- checkout still accepts table numbers even if no table/session is configured.
create or replace function public.phase5_order_insert() returns trigger language plpgsql security definer set search_path=public as $$
declare v_session uuid;
begin
  if new.delivery_address is not null then
    insert into delivery_jobs(order_id) values(new.id) on conflict do nothing;
  elsif new.table_number is not null then
    select s.id into v_session from dining_sessions s join restaurant_tables t on t.id=s.table_id
      where s.closed_at is null and t.table_number=new.table_number limit 1 for update of s;
    if v_session is not null then insert into dining_session_orders(session_id,order_id) values(v_session,new.id); end if;
  end if;
  return new;
end $$;
drop trigger if exists phase5_order_insert on public.orders;
create trigger phase5_order_insert after insert on public.orders for each row execute function public.phase5_order_insert();

-- Do not deactivate or change the identity of a driver with a live job.
create or replace function public.guard_active_driver() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if (not new.is_active or new.profile_id is distinct from old.profile_id) and exists(select 1 from delivery_jobs where driver_id=old.id and status in ('assigned','picked_up','on_the_way')) then
    raise exception 'driver_has_active_delivery';
  end if;
  return new;
end $$;
drop trigger if exists guard_active_driver on public.delivery_drivers;
create trigger guard_active_driver before update on public.delivery_drivers for each row execute function public.guard_active_driver();

create or replace function public.assign_delivery(p_order_id uuid,p_driver_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_order orders%rowtype; v_job delivery_jobs%rowtype;
begin
  if not public.is_manager() then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into v_order from orders where id=p_order_id for update;
  if not found or v_order.delivery_address is null or v_order.status in ('completed','cancelled') then raise exception 'order_not_assignable'; end if;
  perform 1 from delivery_drivers where id=p_driver_id and is_active for update;
  if not found then raise exception 'driver_unavailable'; end if;
  insert into delivery_jobs(order_id) values(p_order_id) on conflict do nothing;
  select * into v_job from delivery_jobs where order_id=p_order_id for update;
  if v_job.status not in ('unassigned','assigned') then raise exception 'delivery_already_started'; end if;
  delete from delivery_locations where order_id=p_order_id;
  update delivery_jobs set driver_id=p_driver_id,status='assigned',assigned_at=now() where order_id=p_order_id;
  insert into audit_logs(user_id,action,entity_type,entity_id,old_value,new_value) values(auth.uid(),'update','delivery_assignment',p_order_id,jsonb_build_object('driver_id',v_job.driver_id),jsonb_build_object('driver_id',p_driver_id));
end $$;

-- Prevent the old order transition RPC from marking an undelivered delivery
-- completed. Driver delivery completion updates the job first, then the order.
create or replace function public.guard_delivery_order_completion() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='completed' and old.status is distinct from new.status and new.delivery_address is not null and exists(select 1 from delivery_jobs j where j.order_id=new.id and j.status <> 'delivered') then
    raise exception 'delivery_not_delivered';
  end if;
  return new;
end $$;
drop trigger if exists guard_delivery_order_completion on public.orders;
create trigger guard_delivery_order_completion before update of status on public.orders for each row execute function public.guard_delivery_order_completion();

create or replace function public.cancel_delivery_with_order() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='cancelled' and old.status is distinct from new.status then
    update delivery_jobs set status='cancelled' where order_id=new.id and status not in ('delivered','cancelled');
    delete from delivery_locations where order_id=new.id;
  end if;
  return new;
end $$;
drop trigger if exists cancel_delivery_with_order on public.orders;
create trigger cancel_delivery_with_order after update of status on public.orders for each row execute function public.cancel_delivery_with_order();

-- Managers may cancel even after pickup, without letting a driver change
-- prices/customer data. The order trigger marks the job cancelled and erases
-- its last location atomically.
create or replace function public.cancel_delivery(p_order_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_order orders%rowtype;
begin
  if not public.is_manager() then raise exception 'not_authorized' using errcode='42501'; end if;
  select * into v_order from orders where id=p_order_id for update;
  if not found or v_order.delivery_address is null or v_order.status in ('completed','cancelled') then raise exception 'order_not_cancellable'; end if;
  update orders set status='cancelled' where id=p_order_id;
end $$;

create or replace function public.advance_delivery(p_order_id uuid,p_expected text,p_next text) returns void language plpgsql security definer set search_path=public as $$
declare v_job delivery_jobs%rowtype; v_order orders%rowtype;
begin
  select * into v_order from orders where id=p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  select * into v_job from delivery_jobs where order_id=p_order_id for update;
  if not found or not public.is_assigned_driver(p_order_id) then raise exception 'not_authorized' using errcode='42501'; end if;
  if v_job.status is distinct from p_expected then raise exception 'delivery_changed_refresh'; end if;
  if v_order.status <> 'ready' or not ((p_expected='assigned' and p_next='picked_up') or (p_expected='picked_up' and p_next='on_the_way') or (p_expected='on_the_way' and p_next='delivered')) then raise exception 'invalid_delivery_transition'; end if;
  update delivery_jobs set status=p_next, picked_up_at=case when p_next='picked_up' then now() else picked_up_at end,
    started_at=case when p_next='on_the_way' then now() else started_at end,
    delivered_at=case when p_next='delivered' then now() else delivered_at end where order_id=p_order_id;
  if p_next='delivered' then
    delete from delivery_locations where order_id=p_order_id;
    update orders set status='completed' where id=p_order_id;
  end if;
  insert into audit_logs(user_id,action,entity_type,entity_id,old_value,new_value) values(auth.uid(),'update','delivery_status',p_order_id,jsonb_build_object('status',p_expected),jsonb_build_object('status',p_next));
end $$;

create or replace function public.publish_driver_location(p_order_id uuid,p_lat double precision,p_lng double precision) returns void language plpgsql security definer set search_path=public as $$
declare v_status text; v_updated timestamptz;
begin
  select status into v_status from delivery_jobs where order_id=p_order_id for update;
  if not found or not public.is_assigned_driver(p_order_id) or v_status <> 'on_the_way' then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_lat is null or p_lng is null or not (p_lat between -90 and 90 and p_lng between -180 and 180) then raise exception 'invalid_coordinates'; end if;
  select updated_at into v_updated from delivery_locations where order_id=p_order_id;
  if v_updated is not null and v_updated > now() - interval '5 seconds' then return; end if;
  insert into delivery_locations(order_id,latitude,longitude,updated_at) values(p_order_id,p_lat,p_lng,now()) on conflict(order_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=excluded.updated_at;
end $$;

-- Preserve the original checkout RPC, while allowing optional delivery
-- instructions to be saved atomically with a newly created order.
create or replace function public.create_order_with_notes(p_items jsonb,p_delivery_address text,p_table_number integer,p_notes text) returns uuid language plpgsql security definer set search_path=public as $$
declare v_order uuid;
begin
  if p_notes is not null and length(p_notes)>1000 then raise exception 'instructions_too_long'; end if;
  v_order := public.create_order(p_items,p_delivery_address,p_table_number);
  update orders set notes=nullif(btrim(p_notes),'') where id=v_order and customer_id=auth.uid();
  return v_order;
end $$;

create or replace function public.set_delivery_destination(p_order_id uuid,p_lat double precision,p_lng double precision) returns void language plpgsql security definer set search_path=public as $$
begin
  perform 1 from orders where id=p_order_id and customer_id=auth.uid() and delivery_address is not null and status not in ('completed','cancelled') for update;
  if auth.uid() is null or not found then raise exception 'not_authorized' using errcode='42501'; end if;
  if p_lat is null or p_lng is null or not (p_lat between -90 and 90 and p_lng between -180 and 180) then raise exception 'invalid_coordinates'; end if;
  insert into delivery_destinations(order_id,latitude,longitude,updated_at) values(p_order_id,p_lat,p_lng,now()) on conflict(order_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=excluded.updated_at;
end $$;

-- Only assigned drivers may receive customer addresses via this function.
create or replace function public.driver_deliveries() returns table(order_id uuid,status text,order_status text,address text,notes text,assigned_at timestamptz,latitude double precision,longitude double precision,total_price integer,items jsonb)
language sql stable security definer set search_path=public as $$
  select j.order_id,j.status,o.status,o.delivery_address,o.notes,j.assigned_at,dest.latitude,dest.longitude,o.total_price, coalesce((select jsonb_agg(jsonb_build_object('name',coalesce(mi.name,'Removed item'),'quantity',oi.quantity) order by oi.created_at) from order_items oi left join menu_items mi on mi.id=oi.menu_item_id where oi.order_id=o.id),'[]'::jsonb) from delivery_jobs j join orders o on o.id=j.order_id left join delivery_destinations dest on dest.order_id=j.order_id where public.is_assigned_driver(j.order_id) and j.status in ('assigned','picked_up','on_the_way') and o.status not in ('completed','cancelled') order by j.assigned_at
$$;

create or replace function public.customer_tracking(p_order_id uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_order orders%rowtype; v_result jsonb;
begin
  select * into v_order from orders where id=p_order_id and customer_id=auth.uid() and delivery_address is not null;
  if not found then raise exception 'not_authorized' using errcode='42501'; end if;
  select jsonb_build_object('order_id',v_order.id,'order_status',v_order.status,'delivery_status',j.status,
    'driver_name',case when j.status in ('picked_up','on_the_way') and v_order.status not in ('completed','cancelled') then d.display_name end,
    'driver_phone',case when j.status in ('picked_up','on_the_way') and v_order.status not in ('completed','cancelled') then d.contact_phone end,
    'driver_location',case when j.status='on_the_way' and v_order.status not in ('completed','cancelled') and l.order_id is not null then jsonb_build_object('lat',l.latitude,'lng',l.longitude,'updated_at',l.updated_at) end,
    'destination',case when dest.order_id is not null then jsonb_build_object('lat',dest.latitude,'lng',dest.longitude) end,
    'restaurant',case when geo.id is not null then jsonb_build_object('lat',geo.latitude,'lng',geo.longitude) end)
    into v_result from (select 1) x left join delivery_jobs j on j.order_id=v_order.id left join delivery_drivers d on d.id=j.driver_id left join delivery_locations l on l.order_id=j.order_id left join delivery_destinations dest on dest.order_id=v_order.id left join restaurant_geo geo on geo.id=true;
  return v_result;
end $$;

revoke all on function public.save_restaurant_table(uuid,integer,text,text,boolean),public.open_dining_session(uuid),public.close_dining_session(uuid),public.attach_order_to_session(uuid,uuid),public.assign_delivery(uuid,uuid),public.cancel_delivery(uuid),public.advance_delivery(uuid,text,text),public.publish_driver_location(uuid,double precision,double precision),public.set_delivery_destination(uuid,double precision,double precision),public.create_order_with_notes(jsonb,text,integer,text),public.driver_deliveries(),public.customer_tracking(uuid) from public,anon;
grant execute on function public.save_restaurant_table(uuid,integer,text,text,boolean),public.open_dining_session(uuid),public.close_dining_session(uuid),public.attach_order_to_session(uuid,uuid),public.assign_delivery(uuid,uuid),public.cancel_delivery(uuid),public.advance_delivery(uuid,text,text),public.publish_driver_location(uuid,double precision,double precision),public.set_delivery_destination(uuid,double precision,double precision),public.create_order_with_notes(jsonb,text,integer,text),public.driver_deliveries(),public.customer_tracking(uuid) to authenticated;

do $$ declare t text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach t in array array['restaurant_tables','dining_sessions','dining_session_orders','delivery_jobs','delivery_locations','delivery_destinations','delivery_drivers','restaurant_geo'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
        execute format('alter publication supabase_realtime add table public.%I',t);
      end if;
    end loop;
  end if;
end $$;
