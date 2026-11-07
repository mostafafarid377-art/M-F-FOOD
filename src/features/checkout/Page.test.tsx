// @vitest-environment jsdom
import React from 'react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({rpc:vi.fn(async()=>({data:'order-id',error:null})),clear:vi.fn(),navigate:vi.fn()}));
vi.mock('../../lib/supabase',()=>({supabase:{rpc:m.rpc,from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{enabled:false}})})})})}}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'u'},isDemoMode:false}),useLayout:()=>({currencySymbol:'£',deliveryFee:0,minimumOrder:0}),useCart:()=>({items:[{id:'item',name:'Burger',price:100,quantity:1}],subtotal:100,clearCart:m.clear})}));
vi.mock('react-router-dom',async()=>({...await vi.importActual('react-router-dom'),useNavigate:()=>m.navigate}));
vi.mock('./DeliveryMap',()=>({default:({value,onChange}:any)=><div>Choose pin<button onClick={()=>onChange({lat:30.1,lng:31.2})}>Select pin</button>{value&&'Selected'}</div>}));
import CheckoutPage from './Page';
beforeEach(()=>{Object.defineProperty(globalThis,'crypto',{value:{randomUUID:()=> '00000000-0000-4000-8000-000000000001',subtle:{digest:async()=>new Uint8Array([1,2,3]).buffer}},configurable:true});sessionStorage.clear();});
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('requires an explicit pin and sends only item IDs with structured details',async()=>{
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);await screen.findByText('Choose pin');fireEvent.click(screen.getByText('Place Order'));expect(screen.getByRole('alert').textContent).toContain('select your delivery location');expect(m.rpc).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Select pin'));fireEvent.change(screen.getByLabelText(/Street/),{target:{value:' Main '}});fireEvent.change(screen.getByLabelText(/Building name \/ number/),{target:{value:' 12 '}});fireEvent.change(screen.getByLabelText('Apartment number (optional)'),{target:{value:' 3 '}});fireEvent.change(screen.getByLabelText('Floor (optional)'),{target:{value:' 2 '}});fireEvent.change(screen.getByLabelText(/Phone number/),{target:{value:'01234567890'}});fireEvent.change(screen.getByLabelText('Delivery instructions (optional)'),{target:{value:'Door'}});fireEvent.click(screen.getByText('Place Order'));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_checkout_order',expect.objectContaining({p_items:[{menu_item_id:'item',quantity:1}],p_method:'cash',p_table_number:null,p_building:'12',p_apartment:'3',p_floor:'2',p_street:'Main',p_phone:'01234567890',p_instructions:'Door',p_lat:30.1,p_lng:31.2})));expect(m.clear).toHaveBeenCalled();
});
it('keeps cash dine-in checkout',async()=>{
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);fireEvent.click(screen.getByText('Dine-in'));fireEvent.change(screen.getByLabelText('Table number'),{target:{value:'7'}});fireEvent.click(screen.getByText('Place Order'));await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_checkout_order',expect.objectContaining({p_items:[{menu_item_id:'item',quantity:1}],p_method:'cash',p_table_number:7})));
});
it('reuses the request id after a lost checkout response',async()=>{
 m.rpc.mockImplementationOnce(async()=>({data:null,error:{message:'Network error'}}) as any);
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);fireEvent.click(screen.getByText('Dine-in'));fireEvent.change(screen.getByLabelText('Table number'),{target:{value:'7'}});fireEvent.click(screen.getByText('Place Order'));
 expect((await screen.findByRole('alert')).textContent).toContain('Network error');const first=(m.rpc.mock.calls as unknown as Array<[string,any]>)[0][1];
 fireEvent.click(screen.getByText('Place Order'));await waitFor(()=>expect(m.rpc).toHaveBeenCalledTimes(2));const second=(m.rpc.mock.calls as unknown as Array<[string,any]>)[1][1];expect(first.p_request_id).toBe(second.p_request_id);
});
