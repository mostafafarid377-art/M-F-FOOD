// @vitest-environment jsdom
import React from 'react';
import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen } from '@testing-library/react';
const rows=[{id:'p1',order_id:'order1',status:'failed',payment_method:'card',amount:12500,currency:'EGP',provider:'paymob',transaction_id:null,provider_order_id:'123',created_at:'2026-11-07T12:00:00Z',paid_at:null,orders:{profiles:{full_name:'Customer One'}}},{id:'p2',order_id:'order2',status:'paid',payment_method:'card',amount:20000,currency:'EGP',provider:'paymob',transaction_id:'456',provider_order_id:'124',created_at:'2026-11-06T12:00:00Z',paid_at:'2026-11-06T12:05:00Z',orders:{profiles:{full_name:'Customer Two'}}}];
vi.mock('../../app/providers',()=>({useLayout:()=>({currencySymbol:'£'})}));
vi.mock('../../lib/supabase',()=>({supabase:{from:()=>({select:()=>({order:()=>({limit:async()=>({data:rows,error:null})})})})}}));
import Payments from './Management';
afterEach(cleanup);
it('shows payment details and filters by status and date without payment mutation controls',async()=>{render(<Payments/>);expect(await screen.findByText(/Customer One/)).toBeTruthy();expect(screen.getByText(/Customer Two/)).toBeTruthy();fireEvent.change(screen.getByLabelText('Status'),{target:{value:'failed'}});expect(screen.getByText(/Customer One/)).toBeTruthy();expect(screen.queryByText(/Customer Two/)).toBeNull();fireEvent.change(screen.getByLabelText('Date (UTC)'),{target:{value:'2026-11-06'}});expect(screen.queryByText(/Customer One/)).toBeNull();expect(screen.queryByText(/mark paid/i)).toBeNull();});
