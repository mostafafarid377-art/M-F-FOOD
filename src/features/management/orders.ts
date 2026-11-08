import { useCallback, useEffect, useRef, useState } from 'react';
import type { OrderRow, OrderStatus } from '../../types/supabase';
import { supabase } from '../../lib/supabase';

export type ManagedOrder = OrderRow & {
  profiles?: { full_name: string | null; phone: string | null } | null;
  order_items: { id: string; quantity: number; price_at_order: number; menu_items: { name: string } | null }[];
};
export const ACTIVE: OrderStatus[] = ['pending', 'confirmed', 'preparing', 'ready'];
export const statusLabel = (status: string) => status === 'confirmed' ? 'Accepted' : status.charAt(0).toUpperCase() + status.slice(1);
export function nextStatus(status: OrderStatus): OrderStatus | null {
  return ({ pending: 'confirmed', confirmed: 'preparing', preparing: 'ready', ready: 'completed' } as Partial<Record<OrderStatus, OrderStatus>>)[status] ?? null;
}

/** Subscribe first, then reload on each event/reconnect. Full replacement by ID,
 * request sequencing and periodic reconciliation prevent duplicates and repair
 * missed events (including updates that cease to satisfy RLS). */
export type OrderFilters = {search:string;status:string;date:string};
export function useLiveOrders(kitchen: boolean, filters: OrderFilters = {search:'',status:'',date:''}) {
  const [page, setPage] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const {search,status,date}=filters;
  const [orders, setOrders] = useState<ManagedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [connection, setConnection] = useState('Connecting');
  const generation = useRef(0);
  const alive = useRef(false);
  const refresh = useCallback(async () => {
    if (!supabase) return;
    const request = ++generation.current;
    try {
      const pageSize = 50;
      let data: unknown[] | null; let dbError: {message:string} | null;
      if (kitchen) {
        const result = await supabase.from('orders').select('*,order_items(id,quantity,price_at_order,menu_items(name))')
          .in('status',ACTIVE).order('created_at',{ascending:false}).order('id',{ascending:false})
          .range(page*pageSize,page*pageSize+pageSize);
        data=result.data;dbError=result.error;
      } else {
        const start=date ? new Date(`${date}T00:00:00`) : null;
        const end=start ? new Date(start.getFullYear(),start.getMonth(),start.getDate()+1) : null;
        const result = await supabase.rpc('management_orders_page',{
          p_search:search.trim().slice(0,36),p_status:status,p_from:start?.toISOString() ?? null,
          p_to:end?.toISOString() ?? null,p_offset:page*pageSize,p_limit:pageSize+1
        }).select('*,profiles(full_name,phone),order_items(id,quantity,price_at_order,menu_items(name))').order('created_at',{ascending:false}).order('id',{ascending:false});
        data=result.data;dbError=result.error;
      }
      if (dbError) throw dbError;
      const all=(data ?? []) as ManagedOrder[];
      if (alive.current && request === generation.current) {
        setHasNext(all.length > pageSize);
        setOrders(Array.from(new Map(all.slice(0,pageSize).map(order => [order.id, order])).values()));
        setError(''); setLoading(false);
      }
    } catch (e) {
      if (alive.current && request === generation.current) { setError(e instanceof Error ? e.message : String((e as {message?: string}).message ?? e)); setLoading(false); }
    }
  }, [kitchen, page, search, status, date]);
  useEffect(() => {
    if (!supabase) return;
    alive.current = true;
    const client = supabase;
    let channel: ReturnType<typeof client.channel> | null = null;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let disposed = false;
    let channelGeneration = 0;
    const connect = () => {
      if (disposed) return;
      const currentChannel = ++channelGeneration;
      setConnection('Connecting');
      channel = client.channel(`orders-${kitchen ? 'kitchen' : 'admin'}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
          clearTimeout(debounce); debounce = setTimeout(() => void refresh(), 150);
        }).subscribe(status => {
          if (disposed || currentChannel !== channelGeneration) return;
          if (status === 'SUBSCRIBED') { setConnection('Live'); void refresh(); }
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
            setConnection('Reconnecting');
            // Ignore CLOSED from removing an obsolete channel, then retry once.
            channelGeneration++;
            const failedChannel = channel; channel = null;
            if (failedChannel) void client.removeChannel(failedChannel);
            clearTimeout(retry);
            retry = setTimeout(connect, 5000);
          }
        });
    };
    connect(); void refresh();
    const poll = setInterval(() => void refresh(), 20000);
    const online = () => { void refresh(); };
    window.addEventListener('online', online);
    return () => { disposed = true; channelGeneration++; alive.current = false; generation.current++; clearTimeout(retry); clearTimeout(debounce); clearInterval(poll); window.removeEventListener('online', online); if (channel) void client.removeChannel(channel); };
  }, [refresh, kitchen]);
  return { orders, loading, error, connection, refresh, page, setPage, hasNext };
}

export async function changeStatus(order: ManagedOrder, next: OrderStatus) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('transition_order', { p_order_id: order.id, p_expected_status: order.status, p_next_status: next });
  if (error) throw new Error(error.message);
}
