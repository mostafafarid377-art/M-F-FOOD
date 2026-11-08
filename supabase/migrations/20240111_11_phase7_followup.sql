-- Proposed Phase 7 follow-up. Does not rewrite migration 09 or existing rows.
-- Replace only the pause trigger/function and the legacy order function. This
-- is intended to converge either known version of 09; confirm actual deployed
-- definitions and restore plans before any approved application.
create or replace function public.phase7_block_online_payment() returns trigger
language plpgsql set search_path=public as $$
begin
 if new.provider = 'paymob' then
  if tg_op = 'INSERT' then raise exception 'online_payments_paused' using errcode='42501'; end if;
  if old.provider is distinct from 'paymob' then raise exception 'online_payments_paused' using errcode='42501'; end if;
 end if;
 return new;
end $$;
revoke all on function public.phase7_block_online_payment() from public,anon,authenticated;
drop trigger if exists phase7_pause_online_payment on public.payments;
create trigger phase7_pause_online_payment before insert or update of provider on public.payments for each row execute function public.phase7_block_online_payment();

-- Retain the original signature/grants; defer only the named legacy payment
-- constraint even when a caller has requested immediate constraints.
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

  -- Even callers that requested immediate constraints must wait until checkout
  -- has finished inserting its payment and final server-calculated total.
  set constraints phase7_legacy_cash_payment deferred;

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
