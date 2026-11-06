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
export function useLiveOrders(kitchen: boolean) {
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
      const all: ManagedOrder[] = [];
      const pageSize = 500;
      for (let start = 0; ; start += pageSize) {
        let query = supabase.from('orders').select(kitchen
          ? '*,order_items(id,quantity,price_at_order,menu_items(name))'
          : '*,profiles(full_name,phone),order_items(id,quantity,price_at_order,menu_items(name))')
          .order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + pageSize - 1);
        if (kitchen) query = query.in('status', ACTIVE);
        const { data, error: dbError } = await query;
        if (dbError) throw dbError;
        all.push(...(data as unknown as ManagedOrder[]));
        if ((data?.length ?? 0) < pageSize) break;
      }
      if (alive.current && request === generation.current) {
        setOrders(Array.from(new Map(all.map(order => [order.id, order])).values()));
        setError(''); setLoading(false);
      }
    } catch (e) {
      if (alive.current && request === generation.current) { setError(e instanceof Error ? e.message : String((e as {message?: string}).message ?? e)); setLoading(false); }
    }
  }, [kitchen]);
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
  return { orders, loading, error, connection, refresh };
}

export async function changeStatus(order: ManagedOrder, next: OrderStatus) {
  if (!supabase) throw new Error('Supabase is not configured');
  const { error } = await supabase.rpc('transition_order', { p_order_id: order.id, p_expected_status: order.status, p_next_status: next });
  if (error) throw new Error(error.message);
}
