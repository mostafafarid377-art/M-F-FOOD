// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
import {MemoryRouter} from 'react-router-dom';
const m=vi.hoisted(()=>({id:'a',requests:[] as any[],channels:[] as any[]}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:m.id},isDemoMode:false}),useLayout:()=>({currencySymbol:'£'})}));
vi.mock('../../lib/supabase',()=>({supabase:{from:()=>{const q:any={select:()=>q,eq:(_k:string,id:string)=>{q.id=id;return q;},order:()=>new Promise(resolve=>m.requests.push({id:q.id,resolve}))};return q;},channel:()=>{const c:any={on:(_a:any,filter:any,cb:any)=>{c.filter=filter;c.event=cb;return c;},subscribe:(cb:any)=>{c.status=cb;return c;}};m.channels.push(c);return c;},removeChannel:vi.fn()}}));
import Page from './Page';
const row=(id:string)=>({id,created_at:'2024-01-01',status:'pending',total_price:12500,delivery_address:null,notes:null,delivery_details:null,payments:null,table_number:1,order_items:[]});
afterEach(()=>{cleanup();m.requests=[];m.channels=[];m.id='a';});
it('isolates account responses and refreshes only the current customer subscription',async()=>{
 const view=render(<MemoryRouter><Page/></MemoryRouter>);await waitFor(()=>expect(m.requests.length).toBe(1));expect(m.channels[0].filter.filter).toBe('customer_id=eq.a');
 m.id='b';view.rerender(<MemoryRouter><Page/></MemoryRouter>);await waitFor(()=>expect(m.requests.length).toBe(2));
 await act(async()=>m.requests[1].resolve({data:[row('bbbbbbbb')],error:null}));expect(screen.getByText('#bbbbbbbb')).toBeTruthy();
 await act(async()=>m.requests[0].resolve({data:[row('aaaaaaaa')],error:null}));expect(screen.queryByText('#aaaaaaaa')).toBeNull();
 act(()=>m.channels[1].event());await waitFor(()=>expect(m.requests.length).toBe(3));await act(async()=>m.requests[2].resolve({data:[row('cccccccc')],error:null}));expect(screen.getByText('#cccccccc')).toBeTruthy();
});
