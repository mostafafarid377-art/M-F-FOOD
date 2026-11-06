-- Phase 4: additive management permissions and audited status workflow.
-- Existing 'confirmed' means Accepted. No existing orders are rewritten.

create or replace function public.is_manager()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_admin() or exists (
    select 1 from public.staff_members s join public.profiles p on p.id = s.profile_id
    where s.profile_id = auth.uid() and s.is_active and s.role = 'manager' and p.role = 'staff'
  );
$$;

create or replace function public.is_kitchen()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_manager() or exists (
    select 1 from public.staff_members s join public.profiles p on p.id = s.profile_id
    where s.profile_id = auth.uid() and s.is_active and s.role = 'chef' and p.role = 'staff'
  );
$$;
revoke all on function public.is_manager() from public, anon;
revoke all on function public.is_kitchen() from public, anon;
grant execute on function public.is_manager(), public.is_kitchen() to authenticated;

-- SQL editor/service role can bootstrap staff without weakening client checks.
create or replace function public.prevent_role_escalation()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin()
     and not (auth.uid() is null and current_user in ('postgres', 'supabase_admin', 'service_role')) then
    raise exception 'role_change_forbidden' using errcode = '42501';
  end if;
  return new;
end $$;

-- Prevent a customer inserting a replacement profile with an elevated role.
drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles for insert to authenticated
  with check (auth.uid() = id and role = 'customer');
-- Managers need customer names/phones to fulfil orders. Kitchen staff do not.
drop policy if exists profiles_manager_read on public.profiles;
create policy profiles_manager_read on public.profiles for select to authenticated
  using (public.is_manager() and exists (select 1 from public.orders o where o.customer_id = profiles.id));

-- Menu managers may read hidden/unavailable rows and edit the menu.
drop policy if exists categories_manager_all on public.categories;
create policy categories_manager_all on public.categories for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
drop policy if exists menu_items_manager_all on public.menu_items;
create policy menu_items_manager_all on public.menu_items for all to authenticated
  using (public.is_manager()) with check (public.is_manager());
-- Kitchen order item joins must still resolve names of unavailable items.
drop policy if exists menu_items_kitchen_read on public.menu_items;
create policy menu_items_kitchen_read on public.menu_items for select to authenticated
  using (public.is_kitchen() and exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.menu_item_id = menu_items.id and o.status in ('pending','confirmed','preparing','ready')
  ));

-- All client-side order writes must go through trusted RPCs. Existing
-- create_order is SECURITY DEFINER and continues to work unchanged.
drop policy if exists orders_customer_insert on public.orders;
drop policy if exists orders_admin_all on public.orders;
drop policy if exists orders_manager_read on public.orders;
create policy orders_manager_read on public.orders for select to authenticated using (public.is_manager());
drop policy if exists orders_kitchen_read on public.orders;
create policy orders_kitchen_read on public.orders for select to authenticated
  using (public.is_kitchen() and status in ('pending','confirmed','preparing','ready'));
drop policy if exists order_items_customer_insert on public.order_items;
drop policy if exists order_items_admin_all on public.order_items;
drop policy if exists order_items_manager_read on public.order_items;
create policy order_items_manager_read on public.order_items for select to authenticated using (public.is_manager());
drop policy if exists order_items_kitchen_read on public.order_items;
create policy order_items_kitchen_read on public.order_items for select to authenticated
  using (public.is_kitchen() and exists (
    select 1 from public.orders o where o.id = order_items.order_id
      and o.status in ('pending','confirmed','preparing','ready')
  ));

create table if not exists public.order_status_history (
  id uuid primary key default uuid_generate_v4(),
  order_id uuid not null references public.orders(id) on delete cascade,
  old_status text,
  new_status text not null,
  changed_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_status_history_order on public.order_status_history(order_id, created_at);
alter table public.order_status_history enable row level security;
grant select on public.order_status_history to authenticated;
drop policy if exists order_history_read on public.order_status_history;
create policy order_history_read on public.order_status_history for select to authenticated
  using (public.is_manager() or exists (
    select 1 from public.orders o where o.id = order_status_history.order_id and o.customer_id = auth.uid()
  ));

-- Customer orders are inserted by the original RPC. This captures their initial
-- status as well as all subsequent trusted transitions, without backfilling or
-- altering historical orders. History and audit are not writable by clients.
create or replace function public.record_order_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by)
      values (new.id, null, new.status, auth.uid());
  elsif old.status is distinct from new.status then
    insert into public.order_status_history(order_id, old_status, new_status, changed_by)
      values (new.id, old.status, new.status, auth.uid());
    insert into public.audit_logs(user_id, action, entity_type, entity_id, old_value, new_value)
      values (auth.uid(), 'update', 'order_status', new.id,
        jsonb_build_object('status', old.status), jsonb_build_object('status', new.status));
  end if;
  return new;
end $$;
drop trigger if exists record_order_status on public.orders;
create trigger record_order_status after insert or update of status on public.orders
  for each row execute function public.record_order_status();

-- Optimistic concurrency through p_expected_status, plus a row lock. This
-- changes ONLY status; prices, payments, customer data and item rows are not
-- writable by kitchen personnel. Cancellation is limited to managers/admins.
create or replace function public.transition_order(p_order_id uuid, p_expected_status text, p_next_status text)
returns void language plpgsql security definer set search_path = public as $$
declare v_current text;
begin
  if auth.uid() is null or not public.is_kitchen() then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  select status into v_current from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  if v_current is distinct from p_expected_status then
    raise exception 'order_status_changed_refresh';
  end if;
  if not (
    (v_current = 'pending' and p_next_status = 'confirmed') or
    (v_current = 'confirmed' and p_next_status = 'preparing') or
    (v_current = 'preparing' and p_next_status = 'ready') or
    (v_current = 'ready' and p_next_status = 'completed' and public.is_manager()) or
    (v_current in ('pending','confirmed','preparing') and p_next_status = 'cancelled' and public.is_manager())
  ) then raise exception 'invalid_or_unauthorized_transition' using errcode = '42501'; end if;
  update public.orders set status = p_next_status where id = p_order_id;
end $$;
revoke all on function public.transition_order(uuid,text,text) from public, anon;
grant execute on function public.transition_order(uuid,text,text) to authenticated;

-- Audit menu and staff management (data is retained in audit_logs). Clients
-- cannot insert audit records: only these triggers / trusted functions do so.
drop policy if exists audit_logs_admin_insert on public.audit_logs;
create or replace function public.audit_management_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.audit_logs(user_id, action, entity_type, entity_id, old_value, new_value)
  values (auth.uid(), case when tg_op = 'INSERT' then 'create' else lower(tg_op) end, tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end);
  if tg_op = 'DELETE' then return old; else return new; end if;
end $$;
drop trigger if exists audit_management_change on public.categories;
create trigger audit_management_change after insert or update or delete on public.categories
  for each row execute function public.audit_management_change();
drop trigger if exists audit_management_change on public.menu_items;
create trigger audit_management_change after insert or update or delete on public.menu_items
  for each row execute function public.audit_management_change();
drop trigger if exists audit_management_change on public.staff_members;
create trigger audit_management_change after insert or update or delete on public.staff_members
  for each row execute function public.audit_management_change();

drop trigger if exists audit_profile_role_change on public.profiles;
create trigger audit_profile_role_change after update of role on public.profiles
  for each row when (old.role is distinct from new.role) execute function public.audit_management_change();

-- Supabase Realtime publication. Safe if Realtime is already configured.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
