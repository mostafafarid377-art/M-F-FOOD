// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const m=vi.hoisted(()=>({data:null as any,error:null as any,calls:[] as string[],fitBounds:vi.fn(),setView:vi.fn()}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'owner'},isLoading:false,isDemoMode:false})}));
vi.mock('../../lib/supabase',()=>({supabase:{rpc:async(name:string)=>{m.calls.push(name);return {data:m.data,error:m.error};}}}));
vi.mock('./live',()=>({useRealtimeRefresh:(_t:any,refresh:any)=>{React.useEffect(()=>{refresh();},[]);return 'Live';}}));
vi.mock('react-leaflet',()=>({MapContainer:({children}:any)=><div data-testid="map">{children}</div>,TileLayer:()=>null,CircleMarker:({children}:any)=><div>{children}</div>,Popup:({children}:any)=><div>{children}</div>,Polyline:()=>null,useMap:()=>({fitBounds:m.fitBounds,setView:m.setView})}));
import Tracking from './Tracking';
function show(){render(<MemoryRouter initialEntries={['/track/order-1']}><Routes><Route path="/track/:orderId" element={<Tracking/>}/></Routes></MemoryRouter>);}
beforeEach(()=>{m.error=null;m.calls=[];m.fitBounds.mockClear();m.setView.mockClear();m.data={order_id:'order-1',order_status:'ready',delivery_status:'on_the_way',driver_name:'Driver',driver_phone:null,restaurant:{lat:30,lng:31},destination:{lat:30.1,lng:31.1},driver_location:{lat:30.05,lng:31.05,updated_at:'2020-01-01T00:00:00Z'}};});
afterEach(cleanup);
it('warns when a location is stale and renders the real points',async()=>{show();expect(await screen.findByText(/Location is stale/)).toBeTruthy();expect(screen.getByTestId('map')).toBeTruthy();expect(screen.getByText('Restaurant')).toBeTruthy();expect(screen.getByText('Destination')).toBeTruthy();});
it('shows an authorization error without exposing tracking data',async()=>{m.data=null;m.error={message:'not_authorized'};show();expect((await screen.findByRole('alert')).textContent).toContain('not_authorized');expect(screen.queryByTestId('map')).toBeNull();});

it('is view-only, fits actual points and never writes a destination when the map is clicked',async()=>{
 show();const map=await screen.findByTestId('map');expect(screen.queryByText('Use my current location as destination')).toBeNull();expect(screen.queryByText('Choose destination on map')).toBeNull();fireEvent.click(map);expect(m.calls).toEqual(['customer_tracking']);expect(m.fitBounds).toHaveBeenCalledWith([[30,31],[30.1,31.1],[30.05,31.05]],expect.any(Object));
});
it('keeps legacy orders without coordinates viewable without letting the customer set a pin',async()=>{
 m.data.restaurant=null;m.data.destination=null;m.data.driver_location=null;show();expect(await screen.findByText(/Map unavailable until a location/)).toBeTruthy();expect(screen.queryByText('Choose destination on map')).toBeNull();expect(m.calls).toEqual(['customer_tracking']);
});
