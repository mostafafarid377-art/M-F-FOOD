-- Phase 7 additive safety: no existing payment or order rows are rewritten.
-- Paymob remains blocked until a separately reviewed future migration. Existing
-- sessions and callbacks continue to reconcile, and cash remains available.
create or replace function public.phase7_block_online_payment() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.provider = 'paymob' then raise exception 'online_payments_paused' using errcode='42501'; end if;
 return new;
end $$;
revoke all on function public.phase7_block_online_payment() from public,anon,authenticated;
create trigger phase7_pause_online_payment before insert on public.payments for each row execute function public.phase7_block_online_payment();
create or replace function public.phase7_block_online_session() returns trigger
language plpgsql set search_path=public as $$
begin raise exception 'online_payments_paused' using errcode='42501'; end $$;
revoke all on function public.phase7_block_online_session() from public,anon,authenticated;
create trigger phase7_pause_online_session before insert on public.payment_sessions_private for each row execute function public.phase7_block_online_session();

-- No new provider claims even for previously created pending online orders.
-- Existing claimed sessions remain available to finish and webhook processing.
create or replace function public.claim_paymob_intention(p_order uuid,p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
begin raise exception 'online_payments_paused' using errcode='42501'; end $$;
revoke all on function public.claim_paymob_intention(uuid,uuid) from public,anon,authenticated;
grant execute on function public.claim_paymob_intention(uuid,uuid) to service_role;

-- Preserve legacy table sessions for active employees and admins only. The
-- public available-table policy remains as before.
drop policy if exists table_sessions_staff_read on public.table_sessions;
create policy table_sessions_staff_read on public.table_sessions for select to authenticated using(public.is_kitchen());
drop policy if exists table_sessions_staff_write on public.table_sessions;
create policy table_sessions_staff_write on public.table_sessions for insert to authenticated with check(public.is_kitchen());
drop policy if exists table_sessions_staff_update on public.table_sessions;
create policy table_sessions_staff_update on public.table_sessions for update to authenticated using(public.is_kitchen()) with check(public.is_kitchen());

-- These functions retain their existing signatures and grants. Enforce limits
-- for current checkout AND old clients without editing previously applied SQL.
create or replace function public.create_order(
  p_items            jsonb,
  p_delivery_address text default null,
  p_table_number     integer default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id       uuid;
  v_subtotal       integer := 0;
  v_total          integer := 0;
  v_delivery_fee   integer := 0;
  v_minimum_order  integer := 0;
  v_item           jsonb;
  v_menu_item_id   uuid;
  v_quantity       integer;
  v_total_quantity integer := 0;
  v_price          integer;
begin
  -- Must be signed in; the order belongs to the caller, nobody else.
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  if p_items is null
     or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'order_must_contain_items';
  end if;

  if jsonb_array_length(p_items) > 100 then raise exception 'too_many_order_lines'; end if;

  if p_delivery_address is null and p_table_number is null then
    raise exception 'delivery_address_or_table_number_required';
  end if;

  if length(coalesce(p_delivery_address, '')) > 500 then raise exception 'delivery_address_too_long'; end if;

  -- Restaurant rules come from the database, not from the client.
  select delivery_fee, minimum_order
    into v_delivery_fee, v_minimum_order
  from public.restaurant_settings
  order by created_at asc
  limit 1;
  v_delivery_fee  := coalesce(v_delivery_fee, 0);
  v_minimum_order := coalesce(v_minimum_order, 0);

  -- Create the order shell; total_price is filled in after validation.
  insert into public.orders (customer_id, status, total_price,
                             delivery_address, table_number)
  values (auth.uid(), 'pending', 0,
          nullif(btrim(coalesce(p_delivery_address, '')), ''),
          p_table_number)
  returning id into v_order_id;

  -- Validate and price every line from menu_items (server-side truth).
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    begin
      v_menu_item_id := (v_item ->> 'menu_item_id')::uuid;
    exception when others then
      raise exception 'invalid_menu_item_id: %', v_item ->> 'menu_item_id';
    end;

    v_quantity := coalesce((v_item ->> 'quantity')::integer, 0);
    if v_quantity <= 0 or v_quantity > 100 then
      raise exception 'invalid_quantity_for_item %', v_menu_item_id;
    end if;

    v_total_quantity := v_total_quantity + v_quantity;
    if v_total_quantity > 1000 then raise exception 'too_many_order_items'; end if;

    select price into v_price
    from public.menu_items
    where id = v_menu_item_id and is_available = true;

    if not found then
      raise exception 'menu_item_unavailable: %', v_menu_item_id;
    end if;

    insert into public.order_items (order_id, menu_item_id, quantity, price_at_order)
    values (v_order_id, v_menu_item_id, v_quantity, v_price);

    v_subtotal := v_subtotal + (v_price * v_quantity);
  end loop;

  -- Enforce the minimum order on the server too.
  if v_subtotal < v_minimum_order then
    raise exception 'minimum_order_not_met: subtotal % piastres < minimum % piastres',
      v_subtotal, v_minimum_order;
  end if;

  -- Delivery fee applies only to delivery orders.
  v_total := v_subtotal
             + case when p_delivery_address is not null then v_delivery_fee else 0 end;

  update public.orders set total_price = v_total where id = v_order_id;

  -- Audit trail (inserted by the definer; the caller cannot fake it).
  insert into public.audit_logs (user_id, action, entity_type, entity_id, new_value)
  values (
    auth.uid(),
    'create',
    'order',
    v_order_id,
    jsonb_build_object(
      'total_price', v_total,
      'item_count', jsonb_array_length(p_items),
      'delivery_address', p_delivery_address,
      'table_number', p_table_number
    )
  );

  return v_order_id;
end;
$$;

create or replace function public.create_checkout_order(
 p_request_id uuid,p_items jsonb,p_method text,p_table_number integer,
 p_building text,p_apartment text,p_floor text,p_street text,p_phone text,p_instructions text,p_lat double precision,p_lng double precision
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_hash text; v_existing public.checkout_requests%rowtype; v_order uuid; v_total integer; v_currency text;
begin
 if v_user is null then raise exception 'not_authenticated'; end if;
 if p_request_id is null then raise exception 'request_id_required'; end if;
 if p_items is null or jsonb_typeof(p_items) <> 'array' then raise exception 'order_must_contain_items'; end if;
 if jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then raise exception 'invalid_order_line_count'; end if;
 v_hash:=md5(jsonb_build_array(p_items,p_method,p_table_number,p_building,p_apartment,p_floor,p_street,p_phone,p_instructions,p_lat,p_lng)::text);
 perform pg_advisory_xact_lock(hashtext(v_user::text),hashtext(p_request_id::text));
 select * into v_existing from checkout_requests where customer_id=v_user and request_id=p_request_id;
 if found then
   if v_existing.payload_hash<>v_hash then raise exception 'request_id_payload_mismatch'; end if;
   return v_existing.order_id;
 end if;
 if not exists(select 1 from payment_methods where code=p_method and enabled) then raise exception 'payment_method_unavailable'; end if;
 if p_method not in ('cash','paymob') then raise exception 'invalid_payment_method'; end if;
 if p_table_number is null then
   v_order:=public.create_order_with_delivery_details(p_items,p_building,p_apartment,p_floor,p_street,p_phone,p_instructions,p_lat,p_lng);
 else
   if p_table_number<=0 then raise exception 'invalid_table_number'; end if;
   v_order:=public.create_order(p_items,null,p_table_number);
 end if;
 select total_price into v_total from orders where id=v_order;
 select currency into v_currency from restaurant_settings order by created_at limit 1;
 v_currency:=coalesce(v_currency,'EGP');
 if p_method='paymob' and (v_currency<>'EGP' or v_total<=0) then raise exception 'invalid_payment_currency_or_amount'; end if;
 insert into payments(order_id,status,payment_method,provider,currency,amount) values(v_order,'pending',case when p_method='cash' then 'cash' else 'card' end,case when p_method='paymob' then 'paymob' else null end,v_currency,v_total);
 insert into checkout_requests(customer_id,request_id,payload_hash,order_id) values(v_user,p_request_id,v_hash,v_order);
 return v_order;
end $$;

-- Legacy RPCs predate payment rows. Reconcile newly created legacy cash orders
-- at transaction end, after current checkout has had a chance to insert its own
-- payment. Existing rows are untouched; no client can choose a payment status.
create or replace function public.phase7_legacy_cash_payment() returns trigger
language plpgsql security definer set search_path=public as $$
declare v_order public.orders%rowtype; v_currency text;
begin
 select * into v_order from public.orders where id=new.id;
 if not found then return new; end if;
 if not exists(select 1 from public.payments where order_id=new.id) then
  select currency into v_currency from public.restaurant_settings order by created_at limit 1;
  insert into public.payments(order_id,status,payment_method,provider,currency,amount)
    values(new.id,'pending','cash',null,coalesce(v_currency,'EGP'),v_order.total_price)
    on conflict(order_id) do nothing;
 end if;
 return new;
end $$;
revoke all on function public.phase7_legacy_cash_payment() from public,anon,authenticated;
create constraint trigger phase7_legacy_cash_payment after insert on public.orders
 deferrable initially deferred for each row execute function public.phase7_legacy_cash_payment();
