-- Structured delivery details are private and additive. Existing orders and
-- the original create_order RPC remain untouched.
create table if not exists public.delivery_details (
  order_id uuid primary key references public.orders(id) on delete cascade,
  building text not null check (length(btrim(building)) between 1 and 160),
  apartment text check (length(apartment) <= 80),
  floor text check (length(floor) <= 80),
  street text not null check (length(btrim(street)) between 1 and 200),
  phone text not null check (length(btrim(phone)) between 7 and 30),
  created_at timestamptz not null default now()
);
alter table public.delivery_details enable row level security;
revoke all on public.delivery_details from anon, authenticated;
grant select on public.delivery_details to authenticated;
create policy delivery_details_authorized_read on public.delivery_details for select to authenticated using (
  public.is_manager() or public.is_assigned_driver(order_id) or
  exists (select 1 from public.orders o where o.id = delivery_details.order_id and o.customer_id = auth.uid())
);

-- All steps are in one transaction, with prices and totals still computed by
-- create_order. The phone is not placed on orders, which kitchen staff can read.
create or replace function public.create_order_with_delivery_details(
  p_items jsonb, p_building text, p_apartment text, p_floor text,
  p_street text, p_phone text, p_instructions text,
  p_lat double precision, p_lng double precision
) returns uuid language plpgsql security definer set search_path = public as $$
declare v_order uuid; v_address text;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode='28000'; end if;
  if p_building is null or length(btrim(p_building)) not between 1 and 160
    or p_street is null or length(btrim(p_street)) not between 1 and 200
    or p_phone is null or length(btrim(p_phone)) not between 7 and 30
    or length(regexp_replace(p_phone, '[^0-9٠-٩۰-۹]', '', 'g')) < 7
    or length(coalesce(p_apartment,'')) > 80 or length(coalesce(p_floor,'')) > 80
    or length(coalesce(p_instructions,'')) > 1000 then
    raise exception 'invalid_delivery_details';
  end if;
  if p_lat is null or p_lng is null or not (p_lat between -90 and 90 and p_lng between -180 and 180) then
    raise exception 'invalid_coordinates';
  end if;
  v_address := concat_ws(', ', btrim(p_street), 'Building: ' || btrim(p_building),
    case when nullif(btrim(p_floor),'') is not null then 'Floor: ' || btrim(p_floor) end,
    case when nullif(btrim(p_apartment),'') is not null then 'Apartment: ' || btrim(p_apartment) end);
  v_order := public.create_order_with_notes(p_items, v_address, null, p_instructions);
  insert into public.delivery_details(order_id,building,apartment,floor,street,phone)
    values(v_order,btrim(p_building),nullif(btrim(p_apartment),''),nullif(btrim(p_floor),''),btrim(p_street),btrim(p_phone));
  insert into public.delivery_destinations(order_id,latitude,longitude) values(v_order,p_lat,p_lng);
  return v_order;
end $$;
revoke all on function public.create_order_with_delivery_details(jsonb,text,text,text,text,text,text,double precision,double precision) from public,anon;
grant execute on function public.create_order_with_delivery_details(jsonb,text,text,text,text,text,text,double precision,double precision) to authenticated;
