-- ===========================================================================
-- M-F-FOOD · Phase 3 — Auth integration & secure order creation
--
--   1. handle_new_user: every new auth.users row gets a profiles row with
--      the DEFAULT 'customer' role — roles never come from the client.
--   2. create_order: SECURITY DEFINER RPC that builds an order from item
--      ids + quantities ONLY. Prices, availability, minimum-order and the
--      total are all computed from menu_items inside Postgres, so
--      frontend-submitted prices/totals can never be trusted.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Auto-create a profile for every new Supabase Auth user
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''), null)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. create_order(items, delivery_address, table_number)
--
--    p_items: jsonb array like [{"menu_item_id": "<uuid>", "quantity": 2}]
--    Runs as the function owner (bypasses RLS inside the function) while
--    attributing the order to auth.uid(). Any raised exception rolls the
--    whole transaction back, so an order+items is always consistent.
-- ---------------------------------------------------------------------------
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

  if p_delivery_address is null and p_table_number is null then
    raise exception 'delivery_address_or_table_number_required';
  end if;

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

-- Only signed-in customers may place orders; anon/public cannot call it.
revoke all on function public.create_order(jsonb, text, integer) from public;
revoke all on function public.create_order(jsonb, text, integer) from anon;
grant execute on function public.create_order(jsonb, text, integer) to authenticated;
