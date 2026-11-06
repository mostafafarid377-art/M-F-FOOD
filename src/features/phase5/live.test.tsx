// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
const m=vi.hoisted(()=>({channels:[] as any[]}));
vi.mock('../../lib/supabase',()=>({supabase:{channel:()=>{const c:any={on:(_e:any,_f:any,cb:any)=>{c.event=cb;return c;},subscribe:(cb:any)=>{c.status=cb;return c;}};m.channels.push(c);return c;},removeChannel:async(c:any)=>c.status?.('CLOSED')}}));
import {useRealtimeRefresh} from './live';
beforeEach(()=>{m.channels=[];vi.useFakeTimers();});
afterEach(()=>{cleanup();vi.useRealTimers();});
it('reconciles after realtime events and reconnect without duplicate channels',async()=>{
 const refresh=vi.fn();const {result,unmount}=renderHook(()=>useRealtimeRefresh(['delivery_jobs'],refresh));
 expect(refresh).toHaveBeenCalledTimes(1);
 act(()=>m.channels[0].status('SUBSCRIBED'));expect(result.current).toBe('Live');expect(refresh).toHaveBeenCalledTimes(2);
 act(()=>{m.channels[0].event();m.channels[0].event();vi.advanceTimersByTime(150);});expect(refresh).toHaveBeenCalledTimes(3);
 const first=m.channels[0];act(()=>first.status('CHANNEL_ERROR'));expect(result.current).toBe('Reconnecting');
 await act(async()=>{vi.advanceTimersByTime(5000);await Promise.resolve();});expect(m.channels).toHaveLength(2);
 act(()=>m.channels[1].status('SUBSCRIBED'));expect(refresh).toHaveBeenCalledTimes(4);
 act(()=>first.status('CLOSED'));await act(async()=>vi.advanceTimersByTime(5000));expect(m.channels).toHaveLength(2);unmount();
});
