-- Bounded manager history and full-dashboard aggregates. Both functions use
-- caller privileges/RLS; no privileged grants or historical rows are changed.
create or replace function public.management_orders_page(
  p_search text default '', p_status text default '', p_from timestamptz default null,
  p_to timestamptz default null, p_offset integer default 0, p_limit integer default 51
) returns setof public.orders language plpgsql stable security invoker set search_path=public as $$
begin
 if auth.uid() is null or not public.is_manager() then raise exception 'not_authorized' using errcode='42501'; end if;
 if length(coalesce(p_search,'')) > 36 or coalesce(p_offset,0) < 0 or coalesce(p_limit,0) not between 1 and 101 then raise exception 'invalid_page'; end if;
 return query select o.* from public.orders o
 where (coalesce(p_search,'')='' or strpos(lower(o.id::text), lower(btrim(p_search)))>0)
   and (coalesce(p_status,'')='' or o.status::text=p_status)
   and (p_from is null or o.created_at>=p_from) and (p_to is null or o.created_at<p_to)
 order by o.created_at desc, o.id desc offset p_offset limit p_limit;
end $$;
revoke all on function public.management_orders_page(text,text,timestamptz,timestamptz,integer,integer) from public,anon;
grant execute on function public.management_orders_page(text,text,timestamptz,timestamptz,integer,integer) to authenticated;

create or replace function public.management_order_summary(p_from timestamptz,p_to timestamptz)
returns jsonb language plpgsql stable security invoker set search_path=public as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_manager() then raise exception 'not_authorized' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_to<=p_from or p_to-p_from>interval '26 hours' then raise exception 'invalid_date_range'; end if;
 select jsonb_build_object('total',count(*),'pending',count(*) filter(where status='pending'),
 'preparing',count(*) filter(where status='preparing'),'completed',count(*) filter(where status='completed'),
 'sales',coalesce(sum(total_price) filter(where status='completed' and updated_at>=p_from and updated_at<p_to),0)) into result from public.orders;
 return result;
end $$;
revoke all on function public.management_order_summary(timestamptz,timestamptz) from public,anon;
grant execute on function public.management_order_summary(timestamptz,timestamptz) to authenticated;

-- Search and delivery status filters are applied before pagination. RLS applies
-- to all joined tables and only managers may call this function.
create or replace function public.management_delivery_page(p_search text default '',p_status text default '',p_offset integer default 0,p_limit integer default 51)
returns setof public.orders language plpgsql stable security invoker set search_path=public as $$
begin
 if auth.uid() is null or not public.is_manager() then raise exception 'not_authorized' using errcode='42501'; end if;
 if length(coalesce(p_search,''))>200 or coalesce(p_offset,0)<0 or coalesce(p_limit,0) not between 1 and 101 then raise exception 'invalid_page'; end if;
 return query select o.* from public.orders o
 left join public.delivery_jobs j on j.order_id=o.id
 left join public.profiles p on p.id=o.customer_id
 where o.delivery_address is not null
 and (coalesce(p_search,'')='' or strpos(lower(o.id::text||' '||o.delivery_address||' '||coalesce(p.full_name,'')),lower(btrim(p_search)))>0)
 and (coalesce(p_status,'')='' or (case when o.status='cancelled' then 'cancelled' when j.status='delivered' then 'delivered' when o.status='completed' then 'completed' when j.status is not null and j.status<>'unassigned' then j.status when o.status='ready' then 'ready' when o.status='preparing' then 'preparing' else 'pending' end)=p_status)
 order by o.created_at desc,o.id desc offset p_offset limit p_limit;
end $$;
revoke all on function public.management_delivery_page(text,text,integer,integer) from public,anon;
grant execute on function public.management_delivery_page(text,text,integer,integer) to authenticated;
