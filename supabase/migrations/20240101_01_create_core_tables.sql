-- ===========================================================================
-- M-F-FOOD · Phase 2 — Core schema
-- PostgreSQL (Supabase) is the source of truth.
--
-- Conventions:
--   * UUID primary keys (uuid_generate_v4)
--   * Monetary values are INTEGER minor units (piastres): 100 piastres = 1 EGP
--   * RLS enabled on EVERY exposed table
--   * No raw payment-card data is ever stored
-- ===========================================================================

create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------------------------
-- 1. profiles — extends auth.users
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  phone       text,
  avatar_url  text,
  role        text not null default 'customer'
              check (role in ('customer', 'staff', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helper functions (SECURITY DEFINER: bypass RLS on profiles to avoid
-- recursive policy lookups). Used by policies below.
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.is_staff()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role in ('staff', 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- 2. categories
-- ---------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  is_visible  boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 3. menu_items — price in piastres
-- ---------------------------------------------------------------------------
create table if not exists public.menu_items (
  id           uuid primary key default uuid_generate_v4(),
  category_id  uuid references public.categories (id) on delete set null,
  name         text not null,
  description  text,
  price        integer not null check (price >= 0), -- piastres
  image_url    text,
  is_available boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. orders — total_price in piastres, written only by trusted server logic
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id               uuid primary key default uuid_generate_v4(),
  customer_id      uuid references public.profiles (id) on delete set null,
  status           text not null default 'pending'
                   check (status in ('pending', 'confirmed', 'preparing',
                                     'ready', 'completed', 'cancelled')),
  total_price      integer not null default 0 check (total_price >= 0), -- piastres
  delivery_address text,
  table_number     integer,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. order_items — price_at_order snapshots the server-side price
-- ---------------------------------------------------------------------------
create table if not exists public.order_items (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null references public.orders (id) on delete cascade,
  menu_item_id   uuid references public.menu_items (id) on delete set null,
  quantity       integer not null check (quantity > 0),
  price_at_order integer not null check (price_at_order >= 0), -- piastres
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 6. payments — one per order; NO raw card data (PCI-DSS): only a gateway
--    transaction reference is stored.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id             uuid primary key default uuid_generate_v4(),
  order_id       uuid not null unique references public.orders (id) on delete cascade,
  status         text not null default 'pending'
                 check (status in ('pending', 'paid', 'failed', 'refunded')),
  payment_method text check (payment_method in ('cash', 'card', 'mobile')),
  transaction_id text, -- payment-gateway reference only, never card numbers
  amount         integer not null check (amount >= 0), -- piastres
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 7. restaurant_settings — currency + fee configuration (piastres)
-- ---------------------------------------------------------------------------
create table if not exists public.restaurant_settings (
  id              uuid primary key default uuid_generate_v4(),
  currency        text not null default 'EGP',
  currency_symbol text not null default '£',
  delivery_fee    integer not null default 200 check (delivery_fee >= 0),    -- 2.00 EGP
  minimum_order   integer not null default 1000 check (minimum_order >= 0),  -- 10.00 EGP
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 8. staff_members
-- ---------------------------------------------------------------------------
create table if not exists public.staff_members (
  id         uuid primary key default uuid_generate_v4(),
  profile_id uuid not null unique references public.profiles (id) on delete cascade,
  role       text not null check (role in ('manager', 'server', 'chef', 'cashier')),
  hire_date  timestamptz not null default now(),
  is_active  boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 9. table_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.table_sessions (
  id               uuid primary key default uuid_generate_v4(),
  table_number     integer not null,
  status           text not null default 'available'
                   check (status in ('available', 'occupied',
                                     'reserved', 'checked_out')),
  current_order_id uuid references public.orders (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 10. audit_logs — append-only record of sensitive actions
-- ---------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid references public.profiles (id) on delete set null,
  action      text not null
              check (action in ('create', 'update', 'delete', 'login', 'logout')),
  entity_type text not null,
  entity_id   uuid,
  old_value   jsonb,
  new_value   jsonb,
  created_at  timestamptz not null default now()
);

-- ===========================================================================
-- updated_at triggers
-- ===========================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_updated_at on public.profiles;
create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.categories;
create trigger set_updated_at before update on public.categories
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.menu_items;
create trigger set_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.orders;
create trigger set_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.payments;
create trigger set_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.restaurant_settings;
create trigger set_updated_at before update on public.restaurant_settings
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.staff_members;
create trigger set_updated_at before update on public.staff_members
  for each row execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.table_sessions;
create trigger set_updated_at before update on public.table_sessions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Role-escalation guard: a non-admin can never change a profile's role,
-- including their own. The frontend is never trusted with roles.
-- ---------------------------------------------------------------------------
create or replace function public.prevent_role_escalation()
returns trigger
language plpgsql
as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'role_change_forbidden'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_role_escalation on public.profiles;
create trigger prevent_role_escalation before update on public.profiles
  for each row execute function public.prevent_role_escalation();

-- ===========================================================================
-- Indexes — every foreign key + frequently queried columns
-- ===========================================================================
create index if not exists idx_profiles_role               on public.profiles (role);
create index if not exists idx_categories_is_visible       on public.categories (is_visible);
create index if not exists idx_categories_sort_order       on public.categories (sort_order);
create index if not exists idx_menu_items_category_id      on public.menu_items (category_id);
create index if not exists idx_menu_items_is_available     on public.menu_items (is_available);
create index if not exists idx_menu_items_name             on public.menu_items (name);
create index if not exists idx_orders_customer_id          on public.orders (customer_id);
create index if not exists idx_orders_status               on public.orders (status);
create index if not exists idx_orders_created_at           on public.orders (created_at desc);
create index if not exists idx_order_items_order_id        on public.order_items (order_id);
create index if not exists idx_order_items_menu_item_id    on public.order_items (menu_item_id);
create index if not exists idx_payments_order_id           on public.payments (order_id);
create index if not exists idx_payments_status             on public.payments (status);
create index if not exists idx_staff_members_profile_id    on public.staff_members (profile_id);
create index if not exists idx_staff_members_is_active     on public.staff_members (is_active);
create index if not exists idx_table_sessions_order_id     on public.table_sessions (current_order_id);
create index if not exists idx_table_sessions_status       on public.table_sessions (status);
create index if not exists idx_table_sessions_table_number on public.table_sessions (table_number);
create index if not exists idx_audit_logs_user_id          on public.audit_logs (user_id);
create index if not exists idx_audit_logs_entity           on public.audit_logs (entity_type, entity_id);
create index if not exists idx_audit_logs_created_at       on public.audit_logs (created_at desc);

-- ===========================================================================
-- Row Level Security — enabled on every exposed table
-- ===========================================================================
alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.menu_items          enable row level security;
alter table public.orders              enable row level security;
alter table public.order_items         enable row level security;
alter table public.payments            enable row level security;
alter table public.restaurant_settings enable row level security;
alter table public.staff_members       enable row level security;
alter table public.table_sessions      enable row level security;
alter table public.audit_logs          enable row level security;

-- ------------------------------ profiles -----------------------------------
-- customers read/update their own profile; admins can do everything.
drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ categories ---------------------------------
-- public (incl. anon) can read visible categories only; admins manage all.
drop policy if exists categories_public_read on public.categories;
create policy categories_public_read on public.categories
  for select using (is_visible = true);

drop policy if exists categories_admin_all on public.categories;
create policy categories_admin_all on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ menu_items ---------------------------------
-- public (incl. anon) can read available items only; admins manage all.
drop policy if exists menu_items_public_read on public.menu_items;
create policy menu_items_public_read on public.menu_items
  for select using (is_available = true);

drop policy if exists menu_items_admin_all on public.menu_items;
create policy menu_items_admin_all on public.menu_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ orders -------------------------------------
-- customers see/create only their own orders (order creation normally goes
-- through the create_order RPC which validates everything server-side);
-- admins can do everything.
drop policy if exists orders_customer_select on public.orders;
create policy orders_customer_select on public.orders
  for select using (customer_id = auth.uid());

drop policy if exists orders_customer_insert on public.orders;
create policy orders_customer_insert on public.orders
  for insert with check (customer_id = auth.uid());

drop policy if exists orders_admin_all on public.orders;
create policy orders_admin_all on public.orders
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ order_items --------------------------------
-- customers see/add items only on orders they own; admins everything.
drop policy if exists order_items_customer_select on public.order_items;
create policy order_items_customer_select on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists order_items_customer_insert on public.order_items;
create policy order_items_customer_insert on public.order_items
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists order_items_admin_all on public.order_items;
create policy order_items_admin_all on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ payments -----------------------------------
-- customers can only READ the payment of their own order. Inserts/updates
-- (status transitions like 'paid') happen server-side only — the frontend
-- can never mark anything as paid. Admins manage all.
drop policy if exists payments_customer_select on public.payments;
create policy payments_customer_select on public.payments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = payments.order_id and o.customer_id = auth.uid()
    )
  );

drop policy if exists payments_admin_all on public.payments;
create policy payments_admin_all on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ restaurant_settings ------------------------
-- public read (currency, fees); admins manage.
drop policy if exists settings_public_read on public.restaurant_settings;
create policy settings_public_read on public.restaurant_settings
  for select using (true);

drop policy if exists settings_admin_all on public.restaurant_settings;
create policy settings_admin_all on public.restaurant_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ staff_members --------------------------------
-- staff see their own record; admins manage all.
drop policy if exists staff_members_select_own on public.staff_members;
create policy staff_members_select_own on public.staff_members
  for select using (profile_id = auth.uid());

drop policy if exists staff_members_admin_all on public.staff_members;
create policy staff_members_admin_all on public.staff_members
  for all using (public.is_admin()) with check (public.is_admin());

-- ------------------------------ table_sessions -------------------------------
-- public can view available tables; staff can view all; staff manage.
drop policy if exists table_sessions_public_read on public.table_sessions;
create policy table_sessions_public_read on public.table_sessions
  for select using (status = 'available');

drop policy if exists table_sessions_staff_read on public.table_sessions;
create policy table_sessions_staff_read on public.table_sessions
  for select using (public.is_staff());

drop policy if exists table_sessions_staff_write on public.table_sessions;
create policy table_sessions_staff_write on public.table_sessions
  for insert with check (public.is_staff());

drop policy if exists table_sessions_staff_update on public.table_sessions;
create policy table_sessions_staff_update on public.table_sessions
  for update using (public.is_staff()) with check (public.is_staff());

-- ------------------------------ audit_logs -----------------------------------
-- admins only. Nobody can update or delete audit entries through the API.
drop policy if exists audit_logs_admin_all on public.audit_logs;
create policy audit_logs_admin_all on public.audit_logs
  for select using (public.is_admin());

drop policy if exists audit_logs_admin_insert on public.audit_logs;
create policy audit_logs_admin_insert on public.audit_logs
  for insert with check (public.is_admin());
