-- ===========================================================================
-- M-F-FOOD · Seed data
-- Safe to re-run: every statement uses ON CONFLICT DO NOTHING.
-- Prices are integer piastres (100 piastres = 1 EGP).
-- The fixed UUIDs match the bundled sample data in src/features/menu/data.ts.
-- ===========================================================================

-- ------------------------------ Categories ---------------------------------
insert into public.categories (id, name, description, is_visible, sort_order) values
  ('00000000-0000-4000-8000-000000000001', 'Burgers', 'Flame-grilled beef & chicken burgers', true, 1),
  ('00000000-0000-4000-8000-000000000002', 'Pizzas',  'Wood-fired, hand-stretched dough',      true, 2),
  ('00000000-0000-4000-8000-000000000003', 'Salads',  'Fresh greens & house dressings',        true, 3),
  ('00000000-0000-4000-8000-000000000004', 'Pastas',  'Classic Italian comfort',               true, 4),
  ('00000000-0000-4000-8000-000000000005', 'Wraps',   'Grilled & rolled to go',                true, 5),
  ('00000000-0000-4000-8000-000000000006', 'Drinks',  'Fresh juices & soft drinks',            true, 6)
on conflict (id) do nothing;

-- ------------------------------ Menu items ---------------------------------
insert into public.menu_items (id, category_id, name, description, price, image_url, is_available) values
  ('00000000-0000-4000-8000-100000000001',
   '00000000-0000-4000-8000-000000000001',
   'Classic Beef Burger',
   'Juicy flame-grilled beef patty, cheddar, lettuce, tomato and our house sauce in a toasted brioche bun.',
   12500, '/images/burger.jpg', true),                                   -- £125.00
  ('00000000-0000-4000-8000-100000000002',
   '00000000-0000-4000-8000-000000000002',
   'Margherita Pizza',
   'Wood-fired pizza with San Marzano tomato sauce, fresh mozzarella and basil.',
   18000, '/images/pizza.jpg', true),                                    -- £180.00
  ('00000000-0000-4000-8000-100000000003',
   '00000000-0000-4000-8000-000000000003',
   'Caesar Salad',
   'Crisp romaine, grilled chicken strips, parmesan shavings, croutons and creamy Caesar dressing.',
   9500, '/images/salad.jpg', true),                                     -- £95.00
  ('00000000-0000-4000-8000-100000000004',
   '00000000-0000-4000-8000-000000000004',
   'Chicken Alfredo Pasta',
   'Fettuccine tossed in a rich parmesan cream sauce with grilled chicken and cracked black pepper.',
   14500, '/images/pasta.jpg', true),                                    -- £145.00
  ('00000000-0000-4000-8000-100000000005',
   '00000000-0000-4000-8000-000000000005',
   'Grilled Chicken Wrap',
   'Marinated grilled chicken, garlic sauce, pickles and fries rolled in toasted saj bread.',
   8500, '/images/wrap.jpg', true),                                      -- £85.00
  ('00000000-0000-4000-8000-100000000006',
   '00000000-0000-4000-8000-000000000006',
   'Fresh Orange Juice',
   'Freshly squeezed Egyptian oranges — no added sugar, served chilled.',
   4500, '/images/juice.jpg', true)                                      -- £45.00
on conflict (id) do nothing;

-- --------------------------- Restaurant settings ---------------------------
-- EGP currency, £ symbol, 200 piastres (2.00 EGP) delivery fee,
-- 1000 piastres (10.00 EGP) minimum order.
insert into public.restaurant_settings (id, currency, currency_symbol, delivery_fee, minimum_order) values
  ('00000000-0000-4000-8000-200000000001', 'EGP', '£', 200, 1000)
on conflict (id) do nothing;

-- ------------------------------ Table sessions ------------------------------
insert into public.table_sessions (id, table_number, status) values
  ('00000000-0000-4000-8000-300000000001', 1, 'available'),
  ('00000000-0000-4000-8000-300000000002', 2, 'available'),
  ('00000000-0000-4000-8000-300000000003', 3, 'occupied'),
  ('00000000-0000-4000-8000-300000000004', 4, 'reserved'),
  ('00000000-0000-4000-8000-300000000005', 5, 'available'),
  ('00000000-0000-4000-8000-300000000006', 6, 'checked_out')
on conflict (id) do nothing;

-- ------------------------------ Staff members -------------------------------
-- staff_members.profile_id must reference a real auth user. This block
-- promotes existing registered users (if any) so the seed never violates
-- the FK: sign up through the app first, then re-run the seed (or assign
-- staff roles from the Supabase dashboard).
do $$
declare
  v_manager uuid;
  v_chef    uuid;
  v_server  uuid;
begin
  select id into v_manager from public.profiles order by created_at asc limit 1 offset 0;
  select id into v_chef    from public.profiles order by created_at asc limit 1 offset 1;
  select id into v_server  from public.profiles order by created_at asc limit 1 offset 2;

  if v_manager is not null then
    update public.profiles set role = 'admin' where id = v_manager;
    insert into public.staff_members (profile_id, role, is_active)
    values (v_manager, 'manager', true)
    on conflict (profile_id) do nothing;
  end if;

  if v_chef is not null then
    update public.profiles set role = 'staff' where id = v_chef;
    insert into public.staff_members (profile_id, role, is_active)
    values (v_chef, 'chef', true)
    on conflict (profile_id) do nothing;
  end if;

  if v_server is not null then
    update public.profiles set role = 'staff' where id = v_server;
    insert into public.staff_members (profile_id, role, is_active)
    values (v_server, 'server', true)
    on conflict (profile_id) do nothing;
  end if;
end $$;

-- ------------------------------ Audit log sample ----------------------------
insert into public.audit_logs (id, user_id, action, entity_type, entity_id, new_value) values
  ('00000000-0000-4000-8000-400000000001', null, 'create', 'category',
   '00000000-0000-4000-8000-000000000001',
   '{"name": "Burgers", "source": "seed"}'::jsonb),
  ('00000000-0000-4000-8000-400000000002', null, 'create', 'menu_item',
   '00000000-0000-4000-8000-100000000001',
   '{"name": "Classic Beef Burger", "price": 12500, "source": "seed"}'::jsonb),
  ('00000000-0000-4000-8000-400000000003', null, 'create', 'restaurant_settings',
   '00000000-0000-4000-8000-200000000001',
   '{"currency": "EGP", "delivery_fee": 200, "minimum_order": 1000, "source": "seed"}'::jsonb)
on conflict (id) do nothing;
