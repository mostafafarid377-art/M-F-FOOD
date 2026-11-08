// @vitest-environment jsdom
import React from 'react';
import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,render,screen } from '@testing-library/react';
import { MemoryRouter,Route,Routes } from 'react-router-dom';
const state=vi.hoisted(()=>({payment:{order_id:'order',status:'processing',amount:12500,currency:'EGP',provider:'paymob',payment_method:'card'} as any,invoke:vi.fn()}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'owner'},isLoading:false,isDemoMode:false}),useLayout:()=>({currencySymbol:'£'})}));
vi.mock('../../lib/supabase',()=>({supabase:{from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:state.payment,error:null})})})}),functions:{invoke:state.invoke}}}));
import PaymentPage from './Page';
function show(){return render(<MemoryRouter initialEntries={['/payment/order']}><Routes><Route path="/payment/:orderId" element={<PaymentPage/>}/></Routes></MemoryRouter>);}
afterEach(()=>{cleanup();state.invoke.mockClear();});
it('does not treat a browser return as payment confirmation or offer an unsafe retry',async()=>{state.payment={...state.payment,status:'processing'};show();expect((await screen.findByRole('status')).textContent).toContain('Processing');expect(screen.queryByText('Payment confirmed by Paymob.')).toBeNull();expect(screen.queryByText('Continue to Paymob')).toBeNull();expect(state.invoke).not.toHaveBeenCalled();});
it('shows success only for the database paid status',async()=>{state.payment={...state.payment,status:'paid'};show();expect(await screen.findByText('Payment confirmed by Paymob.')).toBeTruthy();});
it('preserves pending history but prevents starting another payment while paused',async()=>{state.payment={...state.payment,status:'pending'};show();expect(await screen.findByText(/Online payment is paused/)).toBeTruthy();expect(screen.queryByText('Continue to Paymob')).toBeNull();expect(state.invoke).not.toHaveBeenCalled();});
