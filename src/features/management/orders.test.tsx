// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

const mock = vi.hoisted(() => ({ rows: [] as any[], channels: [] as any[] }));
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => {
      const query: any = { select: () => query, order: () => query, range: () => query, in: () => query,
        then: (resolve: (value: any) => void) => Promise.resolve({ data: [...mock.rows], error: null }).then(resolve) };
      return query;
    },
    channel: () => {
      const c: any = { on: (_event: unknown, _filter: unknown, callback: () => void) => { c.onEvent = callback; return c; },
        subscribe: (callback: (s: string) => void) => { c.onStatus = callback; return c; } };
      mock.channels.push(c); return c;
    },
    removeChannel: async (channel: any) => { channel.onStatus?.('CLOSED'); },
  },
}));
import { useLiveOrders } from './orders';

describe('realtime reconciliation', () => {
  beforeEach(() => { mock.rows = []; mock.channels = []; });
  afterEach(() => { cleanup(); vi.useRealTimers(); });
  it('reloads new orders and replaces duplicate ids', async () => {
    const { result } = renderHook(() => useLiveOrders(true));
    await waitFor(() => expect(result.current.loading).toBe(false));
    mock.rows = [{ id: 'order-1', status: 'pending' }, { id: 'order-1', status: 'pending' }];
    await act(async () => { mock.channels[0].onStatus('SUBSCRIBED'); });
    await waitFor(() => expect(result.current.orders).toHaveLength(1));
    expect(result.current.connection).toBe('Live');
    mock.rows = [{ id: 'order-1', status: 'preparing' }, { id: 'order-2', status: 'pending' }];
    await act(async () => { mock.channels[0].onEvent(); await new Promise(resolve => setTimeout(resolve, 180)); });
    await waitFor(() => expect(result.current.orders).toHaveLength(2));
    expect(result.current.orders[0].status).toBe('preparing');
  });
  it('reconnects once and reloads missed orders', async () => {
    vi.useFakeTimers();
    const { result, unmount } = renderHook(() => useLiveOrders(true));
    await act(async () => { await Promise.resolve(); });
    const first = mock.channels[0];
    act(() => first.onStatus('CHANNEL_ERROR'));
    expect(result.current.connection).toBe('Reconnecting');
    mock.rows = [{ id: 'missed', status: 'pending' }];
    await act(async () => { vi.advanceTimersByTime(5000); await Promise.resolve(); });
    expect(mock.channels).toHaveLength(2);
    await act(async () => { mock.channels[1].onStatus('SUBSCRIBED'); await Promise.resolve(); });
    expect(result.current.orders.map(o => o.id)).toEqual(['missed']);
    act(() => first.onStatus('CLOSED'));
    await act(async () => { vi.advanceTimersByTime(5000); });
    expect(mock.channels).toHaveLength(2);
    unmount();
  });
});
