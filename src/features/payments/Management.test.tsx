// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor} from '@testing-library/react';
const m=vi.hoisted(()=>({queries:[] as any[],rows:[] as any[]}));
vi.mock('../../app/providers',()=>({useLayout:()=>({currencySymbol:'£'})}));
vi.mock('../../lib/supabase',()=>({supabase:{from:()=>{const params:any={};const q:any={select:()=>q,eq:(k:string,v:string)=>{params[k]=v;return q;},gte:(k:string,v:string)=>{params.from=v;return q;},lt:(k:string,v:string)=>{params.to=v;return q;},order:()=>q,range:async(a:number,b:number)=>{params.range=[a,b];m.queries.push(params);const filtered=m.rows.filter(r=>(!params.status||r.status===params.status)&&(!params.from||r.created_at>=params.from)&&(!params.to||r.created_at<params.to));return {data:filtered.slice(a,b+1),error:null};}};return q;}}}));
import Payments from './Management';
afterEach(()=>{cleanup();m.rows=[];m.queries=[];});
it('filters and pages on the server without mutation controls',async()=>{
 m.rows=Array.from({length:52},(_,i)=>({id:`p${i}`,order_id:`order${i}`,status:i===51?'paid':'failed',payment_method:'card',amount:12500,currency:'EGP',provider:'paymob',transaction_id:null,provider_order_id:'123',created_at:'2026-11-07T12:00:00Z',paid_at:null,orders:{profiles:{full_name:`Customer ${i}`}}}));
 render(<Payments/>);expect(await screen.findByText(/Customer 0/)).toBeTruthy();expect(m.queries[0].range).toEqual([0,50]);
 fireEvent.click(screen.getByRole('button',{name:'Next'}));expect(await screen.findByText(/Customer 51/)).toBeTruthy();expect(m.queries[m.queries.length-1].range).toEqual([50,100]);
 fireEvent.change(screen.getByLabelText('Status'),{target:{value:'paid'}});await waitFor(()=>expect(m.queries[m.queries.length-1]).toMatchObject({status:'paid',range:[0,50]}));expect(await screen.findByText(/Customer 51/)).toBeTruthy();expect(screen.queryByText(/Customer 0/)).toBeNull();
 fireEvent.change(screen.getByLabelText('Date (UTC)'),{target:{value:'2026-11-06'}});await waitFor(()=>expect(m.queries[m.queries.length-1]).toMatchObject({from:'2026-11-06T00:00:00.000Z',to:'2026-11-07T00:00:00.000Z'}));await waitFor(()=>expect(screen.queryByText(/Customer 51/)).toBeNull());expect(screen.queryByText(/mark paid/i)).toBeNull();
});
