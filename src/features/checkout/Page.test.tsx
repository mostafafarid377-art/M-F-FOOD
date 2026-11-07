// @vitest-environment jsdom
import React from 'react';
import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({rpc:vi.fn(async()=>({data:'order-id',error:null})),clear:vi.fn(),navigate:vi.fn()}));
vi.mock('../../lib/supabase',()=>({supabase:{rpc:m.rpc}}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'u'},isDemoMode:false}),useLayout:()=>({currencySymbol:'£',deliveryFee:0,minimumOrder:0}),useCart:()=>({items:[{id:'item',name:'Burger',price:100,quantity:1}],subtotal:100,clearCart:m.clear})}));
vi.mock('react-router-dom',async()=>({...await vi.importActual('react-router-dom'),useNavigate:()=>m.navigate}));
vi.mock('./DeliveryMap',()=>({default:({value,onChange}:any)=><div>Choose pin<button onClick={()=>onChange({lat:30.1,lng:31.2})}>Select pin</button>{value&&'Selected'}</div>}));
import CheckoutPage from './Page';
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('requires an explicit pin and sends only item IDs with structured details',async()=>{
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);await screen.findByText('Choose pin');fireEvent.click(screen.getByText('Place Order'));expect(screen.getByRole('alert').textContent).toContain('select your delivery location');expect(m.rpc).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Select pin'));fireEvent.change(screen.getByLabelText(/Street/),{target:{value:' Main '}});fireEvent.change(screen.getByLabelText(/Building name \/ number/),{target:{value:' 12 '}});fireEvent.change(screen.getByLabelText('Apartment number (optional)'),{target:{value:' 3 '}});fireEvent.change(screen.getByLabelText('Floor (optional)'),{target:{value:' 2 '}});fireEvent.change(screen.getByLabelText(/Phone number/),{target:{value:'01234567890'}});fireEvent.change(screen.getByLabelText('Delivery instructions (optional)'),{target:{value:'Door'}});fireEvent.click(screen.getByText('Place Order'));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_order_with_delivery_details',{p_items:[{menu_item_id:'item',quantity:1}],p_building:'12',p_apartment:'3',p_floor:'2',p_street:'Main',p_phone:'01234567890',p_instructions:'Door',p_lat:30.1,p_lng:31.2}));expect(m.clear).toHaveBeenCalled();
});
it('keeps the legacy dine-in RPC',async()=>{
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);fireEvent.click(screen.getByText('Dine-in'));fireEvent.change(screen.getByLabelText('Table number'),{target:{value:'7'}});fireEvent.click(screen.getByText('Place Order'));await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_order',{p_items:[{menu_item_id:'item',quantity:1}],p_delivery_address:null,p_table_number:7}));
});
