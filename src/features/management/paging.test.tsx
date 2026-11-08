// @vitest-environment jsdom
import {afterEach,expect,it,vi} from 'vitest';import {act,cleanup,renderHook,waitFor} from '@testing-library/react';
const m=vi.hoisted(()=>({calls:[] as any[]}));
vi.mock('../../lib/supabase',()=>({supabase:{rpc:(_name:string,args:any)=>{m.calls.push(args);const q:any={select:()=>q,order:()=>q,then:(resolve:any)=>Promise.resolve({data:Array.from({length:args.p_offset?1:51},(_,i)=>({id:`${args.p_offset+i}`})),error:null}).then(resolve)};return q;},channel:()=>{const c:any={on:()=>c,subscribe:()=>c};return c;},removeChannel:async()=>{}}}));
import {useLiveOrders} from './orders';
afterEach(()=>{cleanup();m.calls=[];});
it('requests bounded manager pages and sends search, status and local-day filters to the database',async()=>{
 const {result,rerender}=renderHook(({search})=>useLiveOrders(false,{search,status:'pending',date:'2024-05-06'}),{initialProps:{search:'abcd'}});
 await waitFor(()=>expect(result.current.orders).toHaveLength(50));expect(result.current.hasNext).toBe(true);
 expect(m.calls[0]).toMatchObject({p_search:'abcd',p_status:'pending',p_offset:0,p_limit:51});expect(new Date(m.calls[0].p_from).toDateString()).toBe(new Date(2024,4,6).toDateString());
 act(()=>result.current.setPage(1));await waitFor(()=>expect(result.current.orders).toHaveLength(1));expect(m.calls[m.calls.length-1].p_offset).toBe(50);expect(result.current.hasNext).toBe(false);
 rerender({search:'def'});await waitFor(()=>expect(m.calls[m.calls.length-1].p_search).toBe('def'));
});
