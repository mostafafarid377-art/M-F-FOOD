// @vitest-environment jsdom
import React from 'react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({rpc:vi.fn(async()=>({data:'order-id',error:null})),clear:vi.fn(),navigate:vi.fn(),load:vi.fn(),save:vi.fn(),remove:vi.fn(),online:false}));
vi.mock('../../lib/supabase',()=>({supabase:{rpc:m.rpc,from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{enabled:m.online}})})})})}}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'u'},isDemoMode:false}),useLayout:()=>({currencySymbol:'£',deliveryFee:0,minimumOrder:0}),useCart:()=>({items:[{id:'item',name:'Burger',price:100,quantity:1}],subtotal:100,clearCart:m.clear})}));
vi.mock('react-router-dom',async()=>({...await vi.importActual('react-router-dom'),useNavigate:()=>m.navigate}));
vi.mock('./DeliveryMap',()=>({default:({value,onChange,readOnly}:any)=><div><span>{readOnly?'Saved map':'Choose pin'}</span>{!readOnly&&<button onClick={()=>onChange({lat:30.1,lng:31.2})}>Select pin</button>}{value&&'Selected'}</div>}));
vi.mock('./savedAddress',()=>({loadSavedAddress:m.load,saveAddress:m.save,deleteAddress:m.remove}));
import CheckoutPage from './Page';
beforeEach(()=>{m.load.mockResolvedValue(null);m.save.mockResolvedValue(undefined);m.remove.mockResolvedValue(undefined);m.online=false;Object.defineProperty(globalThis,'crypto',{value:{randomUUID:()=> '00000000-0000-4000-8000-000000000001',subtle:{digest:async()=>new Uint8Array([1,2,3]).buffer}},configurable:true});sessionStorage.clear();});
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

const saved = {street:'Saved Street',building:'4',apartment:'8',floor:'2',phone:'01234567890',latitude:30.1,longitude:31.2};
it('loads a private saved address, allows changing and cancelling, and uses it at checkout', async () => {
 m.load.mockResolvedValue(saved);
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);
 expect(await screen.findByText('Saved map')).toBeTruthy();
 expect(m.load).toHaveBeenCalledWith('u',false);
 fireEvent.click(screen.getByRole('button',{name:'Change'}));
 fireEvent.change(screen.getByLabelText(/Street/),{target:{value:'New Street'}});
 fireEvent.click(screen.getByRole('button',{name:'Cancel changes'}));
 expect(screen.getByText(/Saved Street, Building 4/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:/Place Order/}));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_checkout_order',expect.objectContaining({p_street:'Saved Street',p_building:'4',p_lat:30.1,p_lng:31.2})));
});
it('saves only a valid address and supports updating and deleting it', async () => {
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);
 await screen.findByText('Choose pin');
 fireEvent.click(screen.getByRole('button',{name:'Save address for next time'}));
 expect(screen.getByRole('status').textContent).toContain('Choose a location');expect(m.save).not.toHaveBeenCalled();
 fireEvent.click(screen.getByText('Select pin'));
 fireEvent.change(screen.getByLabelText(/Street/),{target:{value:' Saved Street '}});
 fireEvent.change(screen.getByLabelText(/Building name \/ number/),{target:{value:' 4 '}});
 fireEvent.change(screen.getByLabelText('Apartment number (optional)'),{target:{value:'8'}});
 fireEvent.change(screen.getByLabelText('Floor (optional)'),{target:{value:'2'}});
 fireEvent.change(screen.getByLabelText(/Phone number/),{target:{value:'01234567890'}});
 fireEvent.click(screen.getByRole('button',{name:'Save address for next time'}));
 await screen.findByText('Saved map');expect(m.save).toHaveBeenCalledWith('u',false,saved);
 fireEvent.click(screen.getByRole('button',{name:'Change'}));
 fireEvent.change(screen.getByLabelText(/Street/),{target:{value:'Other Street'}});
 fireEvent.click(screen.getByRole('button',{name:'Save address for next time'}));
 await waitFor(()=>expect(m.save).toHaveBeenLastCalledWith('u',false,expect.objectContaining({street:'Other Street'})));
 await screen.findByText('Saved map');
 fireEvent.click(screen.getByRole('button',{name:'Remove saved address'}));
 await waitFor(()=>expect(m.remove).toHaveBeenCalledWith('u',false));expect(await screen.findByText('Choose pin')).toBeTruthy();
});
it('sends selected delivery instructions and does not invent payment methods or fees', async () => {
 m.load.mockResolvedValue(saved);
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);await screen.findByText('Saved map');
 fireEvent.click(screen.getByRole('button',{name:'Ring doorbell'}));
 fireEvent.click(screen.getByRole('button',{name:'Message on arrival'}));
 fireEvent.click(screen.getByRole('button',{name:'Message on arrival'}));
 fireEvent.change(screen.getByLabelText('Delivery instructions (optional)'),{target:{value:'Side entrance'}});
 expect(screen.getByRole('button',{name:'Ring doorbell'}).getAttribute('aria-pressed')).toBe('true');
 expect(screen.queryByText(/postpaid/i)).toBeNull();expect(screen.queryByText(/service fee/i)).toBeNull();
 fireEvent.click(screen.getByRole('button',{name:/Place Order/}));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_checkout_order',expect.objectContaining({p_method:'cash',p_instructions:'Ring doorbell; Side entrance'})));
});
it('continues checkout when saved address storage fails', async () => {
 m.load.mockRejectedValue(new Error('missing table'));
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);
 expect((await screen.findByRole('status')).textContent).toContain('You can still enter an address');
 fireEvent.click(screen.getByText('Dine-in'));fireEvent.change(screen.getByLabelText('Table number'),{target:{value:'7'}});fireEvent.click(screen.getByRole('button',{name:/Place Order/}));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_checkout_order',expect.objectContaining({p_method:'cash',p_table_number:7})));
});
it('keeps Paymob disabled even if the database flag is enabled, and still permits cash', async () => {
 m.online=true;m.load.mockResolvedValue(saved);
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);await screen.findByText('Saved map');
 const online=screen.getByRole('radio',{name:'Online payment with Paymob'}) as HTMLInputElement;
 expect(online.disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:/Place Order/}));
 await waitFor(()=>expect(m.rpc).toHaveBeenCalledWith('create_checkout_order',expect.objectContaining({p_method:'cash'})));
 expect(m.navigate).not.toHaveBeenCalledWith('/payment/order-id',expect.anything());
});
it('blocks instructions exceeding the server limit including presets', async () => {
 m.load.mockResolvedValue(saved);
 render(<MemoryRouter><CheckoutPage/></MemoryRouter>);await screen.findByText('Saved map');
 fireEvent.click(screen.getByRole('button',{name:'Ring doorbell'}));
 fireEvent.change(screen.getByLabelText('Delivery instructions (optional)'),{target:{value:'x'.repeat(1000)}});
 fireEvent.click(screen.getByRole('button',{name:/Place Order/}));
 expect(screen.getByRole('alert').textContent).toContain('1000 characters');expect(m.rpc).not.toHaveBeenCalled();
});

it('lets checkout continue after a stalled address lookup and ignores its late result', async () => {
 vi.useFakeTimers();
 try {
  let resolve: (value: typeof saved) => void = () => {};
  m.load.mockReturnValue(new Promise<typeof saved>(r => {resolve=r;}));
  render(<MemoryRouter><CheckoutPage/></MemoryRouter>);
  await act(async()=>{vi.advanceTimersByTime(8000);});
  expect(screen.getByRole('status').textContent).toContain('You can still enter an address');
  fireEvent.change(screen.getByLabelText(/Street/),{target:{value:'My current address'}});
  await act(async()=>resolve(saved));
  expect((screen.getByLabelText(/Street/) as HTMLInputElement).value).toBe('My current address');
 } finally { vi.useRealTimers(); }
});
