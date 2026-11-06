import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';

/** Subscribe before reconciling, refresh on reconnect and poll to recover missed
 * RLS-filtered terminal events. Callbacks must replace rather than append data. */
export function useRealtimeRefresh(tables: string[], refresh: () => void, enabled = true) {
  const latest = useRef(refresh); latest.current = refresh;
  const [state, setState] = useState('Connecting');
  const key = tables.join(',');
  useEffect(() => {
    if (!supabase || !enabled) return;
    const client = supabase; let disposed = false; let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let debounce: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof client.channel> | null = null;
    function connect() {
      if (disposed) return;
      const current = ++generation; setState('Connecting');
      let next = client.channel(`phase5-${Math.random().toString(36).slice(2)}`);
      for (const table of key.split(',')) next = next.on('postgres_changes', { event: '*', schema: 'public', table }, () => { clearTimeout(debounce); debounce = setTimeout(() => latest.current(), 150); });
      channel = next.subscribe(status => {
        if (disposed || current !== generation) return;
        if (status === 'SUBSCRIBED') { setState('Live'); latest.current(); }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setState('Reconnecting'); generation++; const old = channel; channel = null;
          if (old) void client.removeChannel(old); clearTimeout(timer); timer = setTimeout(connect, 5000);
        }
      });
    }
    connect(); latest.current(); const poll = setInterval(() => latest.current(), 20000);
    const online = () => latest.current(); window.addEventListener('online', online);
    return () => { disposed = true; generation++; clearTimeout(timer); clearTimeout(debounce); clearInterval(poll); window.removeEventListener('online', online); if (channel) void client.removeChannel(channel); };
  }, [key, enabled]);
  return state;
}
