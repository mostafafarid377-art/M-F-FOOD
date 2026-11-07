-- Active employees can use the kitchen workflow, but only managers/admins
-- retain dashboard, cancellation, completion and contact-detail access.
create or replace function public.is_kitchen()
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_manager() or exists (
    select 1 from public.staff_members s join public.profiles p on p.id = s.profile_id
    where s.profile_id = auth.uid() and s.is_active and p.role = 'staff'
      and s.role in ('manager', 'chef', 'server', 'cashier')
  );
$$;
revoke all on function public.is_kitchen() from public, anon;
grant execute on function public.is_kitchen() to authenticated;

-- Delivery destinations are chosen during atomic checkout, not edited later.
-- This also blocks older clients from calling the legacy mutation RPC.
revoke all on function public.set_delivery_destination(uuid, double precision, double precision) from public, anon, authenticated;
revoke insert, update, delete on public.delivery_destinations from public, anon, authenticated;
