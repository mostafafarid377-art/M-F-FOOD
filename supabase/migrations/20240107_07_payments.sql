-- Payment amounts remain integer piastres and are copied only from trusted orders.
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments add constraint payments_status_check check (status in ('pending','processing','paid','failed','cancelled','refunded'));
alter table public.payments add column if not exists provider text;
alter table public.payments add column if not exists currency text not null default 'EGP';
alter table public.payments add column if not exists provider_order_id text;
alter table public.payments add column if not exists paid_at timestamptz;
create unique index if not exists payments_provider_order_unique on public.payments(provider,provider_order_id) where provider_order_id is not null;
create unique index if not exists payments_transaction_unique on public.payments(provider,transaction_id) where transaction_id is not null;
drop policy if exists payments_admin_all on public.payments;
drop policy if exists payments_manager_select on public.payments;
create policy payments_manager_select on public.payments for select to authenticated using (public.is_manager());
revoke insert, update, delete on public.payments from public, anon, authenticated;
grant select on public.payments to authenticated;

create table public.payment_methods (
  code text primary key, enabled boolean not null default false, provider text,
  check (code in ('cash','paymob'))
);
insert into public.payment_methods(code,enabled,provider) values ('cash',true,null),('paymob',false,'paymob');
alter table public.payment_methods enable row level security;
create policy payment_methods_read on public.payment_methods for select to anon,authenticated using (true);
revoke insert, update, delete on public.payment_methods from public,anon,authenticated;
grant select on public.payment_methods to anon,authenticated;

create table public.checkout_requests (
  customer_id uuid not null references public.profiles(id), request_id uuid not null,
  payload_hash text not null, order_id uuid references public.orders(id),
  created_at timestamptz not null default now(), primary key(customer_id,request_id)
);
alter table public.checkout_requests enable row level security;
revoke all on public.checkout_requests from public,anon,authenticated;

-- These contain checkout session material and callback bookkeeping, not card data.
create table public.payment_sessions_private (
  payment_id uuid primary key references public.payments(id) on delete cascade,
  intention_id text, creation_started_at timestamptz not null default now()
);
create table public.payment_events_private (
  id uuid primary key default uuid_generate_v4(), payment_id uuid not null references public.payments(id),
  provider_transaction_id text not null, event_state text not null,
  created_at timestamptz not null default now(), unique(provider_transaction_id,event_state)
);
alter table public.payment_sessions_private enable row level security;
alter table public.payment_events_private enable row level security;
revoke all on public.payment_sessions_private, public.payment_events_private from public,anon,authenticated;

create or replace function public.create_checkout_order(
 p_request_id uuid,p_items jsonb,p_method text,p_table_number integer,
 p_building text,p_apartment text,p_floor text,p_street text,p_phone text,p_instructions text,p_lat double precision,p_lng double precision
) returns uuid language plpgsql security definer set search_path=public as $$
declare v_user uuid:=auth.uid(); v_hash text; v_existing public.checkout_requests%rowtype; v_order uuid; v_total integer; v_currency text;
begin
 if v_user is null then raise exception 'not_authenticated'; end if;
 if p_request_id is null then raise exception 'request_id_required'; end if;
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
revoke all on function public.create_checkout_order(uuid,jsonb,text,integer,text,text,text,text,text,text,double precision,double precision) from public,anon;
grant execute on function public.create_checkout_order(uuid,jsonb,text,integer,text,text,text,text,text,text,double precision,double precision) to authenticated;

-- A single attempt per order: if provider creation outcome is uncertain, never
-- automatically create another intention. Reconcile manually with Paymob.
create or replace function public.claim_paymob_intention(p_order uuid,p_user uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare p payments%rowtype; o orders%rowtype; s payment_sessions_private%rowtype;
begin
 select * into o from orders where id=p_order and customer_id=p_user for update;
 if not found or o.status <> 'pending' then raise exception 'order_not_payable'; end if;
 select * into p from payments where order_id=o.id for update;
 if not exists(select 1 from payment_methods where code='paymob' and enabled) then raise exception 'payment_method_unavailable'; end if;
 if p.id is null or p.provider<>'paymob' or p.amount<>o.total_price or p.currency<>'EGP' or p.status in ('paid','cancelled','refunded') then raise exception 'payment_not_payable'; end if;
 select * into s from payment_sessions_private where payment_id=p.id;
 if found then
   return jsonb_build_object('state','reconcile');
 end if;
 insert into payment_sessions_private(payment_id) values(p.id);
 update payments set status='processing' where id=p.id;
 return jsonb_build_object('state','claimed','payment_id',p.id,'amount',p.amount,'currency',p.currency,'reference',p.id);
end $$;
create or replace function public.finish_paymob_intention(p_payment uuid,p_provider_order text,p_intention text)
returns void language plpgsql security definer set search_path=public as $$
begin
 if p_provider_order is null or p_intention is null or p_provider_order !~ '^[0-9]+$' or length(p_intention)<1 then raise exception 'invalid_provider_response'; end if;
 update payments set provider_order_id=p_provider_order where id=p_payment and provider='paymob' and provider_order_id is null;
 if not found then raise exception 'payment_not_claimed'; end if;
 update payment_sessions_private set intention_id=p_intention where payment_id=p_payment and intention_id is null;
 if not found then raise exception 'payment_not_claimed'; end if;
end $$;

-- Called only by the HMAC-verifying Edge Function. Provider order, transaction,
-- amount, currency and state passed here are all covered by the signature.
create or replace function public.apply_paymob_transaction(p_provider_order text,p_transaction text,p_amount integer,p_currency text,p_state text)
returns text language plpgsql security definer set search_path=public as $$
declare p payments%rowtype; o orders%rowtype;
begin
 if p_provider_order is null or p_transaction is null or p_amount is null or p_currency is null or p_state is null or p_provider_order !~ '^[0-9]+$' or p_transaction !~ '^[0-9]+$' or p_state not in ('processing','failed','paid') then raise exception 'invalid_event'; end if;
 select * into p from payments where provider='paymob' and provider_order_id=p_provider_order for update;
 if not found then raise exception 'payment_not_found'; end if;
 select * into o from orders where id=p.order_id;
 if p.amount<>p_amount or p.currency<>p_currency or p_currency<>'EGP' or o.total_price<>p_amount then raise exception 'payment_mismatch'; end if;
 if exists(select 1 from payment_events_private where provider_transaction_id=p_transaction and event_state=p_state) then return 'duplicate'; end if;
 if exists(select 1 from payment_events_private where provider_transaction_id=p_transaction and payment_id<>p.id) then raise exception 'transaction_conflict'; end if;
 insert into payment_events_private(payment_id,provider_transaction_id,event_state) values(p.id,p_transaction,p_state);
 -- Do not regress a paid/refunded payment, or turn a previously failed event
 -- back into processing. Only a signed successful transaction may set paid.
 if p.status not in ('paid','refunded','cancelled') and (p_state <> 'processing' or p.status <> 'failed') then
   update payments set status=p_state, transaction_id=case when p_state='paid' then p_transaction else transaction_id end,
      paid_at=case when p_state='paid' then now() else paid_at end where id=p.id;
   insert into audit_logs(user_id,action,entity_type,entity_id,new_value) values(null,'update','payment',p.id,jsonb_build_object('status',p_state,'transaction_id',p_transaction));
 end if;
 return 'ok';
end $$;
revoke all on function public.claim_paymob_intention(uuid,uuid),public.finish_paymob_intention(uuid,text,text),public.apply_paymob_transaction(text,text,integer,text,text) from public,anon,authenticated;
grant execute on function public.claim_paymob_intention(uuid,uuid),public.finish_paymob_intention(uuid,text,text),public.apply_paymob_transaction(text,text,integer,text,text) to service_role;

-- Do not prepare or dispatch unpaid online orders; cancellation of an online
-- order with a potentially chargeable session requires manual reconciliation.
create or replace function public.guard_online_payment_fulfilment() returns trigger language plpgsql security definer set search_path=public as $$
declare p payments%rowtype;
begin
 if new.status is not distinct from old.status then return new; end if;
 select * into p from payments where order_id=new.id and provider='paymob';
 if found then
   if new.status not in ('pending','cancelled') and p.status<>'paid' then raise exception 'online_payment_not_paid'; end if;
   if new.status='cancelled' and (p.status in ('processing','paid','refunded') or exists(select 1 from payment_sessions_private where payment_id=p.id)) then raise exception 'payment_requires_reconciliation'; end if;
 end if;
 return new;
end $$;
create trigger guard_online_payment_fulfilment before update of status on public.orders for each row execute function public.guard_online_payment_fulfilment();
create or replace function public.guard_online_payment_dispatch() returns trigger language plpgsql security definer set search_path=public as $$
begin
 if new.status in ('assigned','picked_up','on_the_way','delivered') and exists(select 1 from payments p where p.order_id=new.order_id and p.provider='paymob' and p.status<>'paid') then raise exception 'online_payment_not_paid'; end if;
 return new;
end $$;
create trigger guard_online_payment_dispatch before insert or update of status on public.delivery_jobs for each row execute function public.guard_online_payment_dispatch();
