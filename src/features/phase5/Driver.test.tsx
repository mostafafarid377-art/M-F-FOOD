// @vitest-environment jsdom
import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({deliveries:[] as any[],updates:[] as any[],watchSuccess:null as any,watchError:null as any,refresh:null as any,clear:vi.fn()}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'driver'},isLoading:false,isDemoMode:false}),useLayout:()=>({currencySymbol:'£'})}));
vi.mock('../../lib/supabase',()=>({supabase:{from:(table:string)=>({select:()=>table==='delivery_details'?({in:async()=>({data:[{order_id:'11111111-1111-4111-8111-111111111111',phone:'01234567890'}],error:null})}):({eq:()=>({maybeSingle:async()=>({data:{id:'driver',is_active:true},error:null})})})}),rpc:async(name:string,args:any)=>{if(name==='driver_deliveries')return {data:m.deliveries,error:null};if(name==='publish_driver_location'){m.updates.push(args);return {data:null,error:null};}return {data:null,error:null};}}}));
vi.mock('./live',()=>({useRealtimeRefresh:(_tables:any,refresh:any)=>{m.refresh=refresh;React.useEffect(()=>{refresh();},[]);return 'Live';}}));
import Driver from './Driver';
const delivery={order_id:'11111111-1111-4111-8111-111111111111',status:'on_the_way',order_status:'ready',address:'Example address',notes:null,assigned_at:'2024-01-01',latitude:null,longitude:null,total_price:12500,items:[{name:'Burger',quantity:1}]};
beforeEach(()=>{m.deliveries=[{...delivery}];m.updates=[];m.clear.mockClear();m.watchSuccess=null;m.watchError=null;Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});Object.defineProperty(navigator,'geolocation',{configurable:true,value:{watchPosition:(success:any,error:any)=>{m.watchSuccess=success;m.watchError=error;return 17;},clearWatch:m.clear}});});
afterEach(()=>cleanup());
describe('driver GPS',()=>{
 it('shares GPS only after the driver explicitly starts, and stops on cancellation',async()=>{
  render(<MemoryRouter><Driver/></MemoryRouter>);const button=await screen.findByRole('button',{name:'Start sharing GPS'});expect(m.updates).toHaveLength(0);fireEvent.click(button);
  await act(async()=>{await m.watchSuccess({coords:{latitude:30.1,longitude:31.2}});});
  expect(m.updates).toEqual([{p_order_id:delivery.order_id,p_lat:30.1,p_lng:31.2}]);
  m.deliveries=[];await act(async()=>{m.refresh();});await waitFor(()=>expect(m.clear).toHaveBeenCalledWith(17));
  expect(screen.getByText('Location sharing stopped.')).toBeTruthy();
 });
 it('shows permission denial and clears the watcher',async()=>{
  render(<MemoryRouter><Driver/></MemoryRouter>);fireEvent.click(await screen.findByRole('button',{name:'Start sharing GPS'}));
  act(()=>m.watchError({code:1,message:'Permission denied'}));expect(m.clear).toHaveBeenCalledWith(17);expect(screen.getByRole('status').textContent).toContain('Permission denied');
 });
 it('does not offer GPS before the delivery starts',async()=>{
  m.deliveries=[{...delivery,status:'assigned'}];render(<MemoryRouter><Driver/></MemoryRouter>);await screen.findByText('Example address');expect(screen.getByText('01234567890')).toBeTruthy();expect(screen.queryByRole('button',{name:'Start sharing GPS'})).toBeNull();
 });
});
