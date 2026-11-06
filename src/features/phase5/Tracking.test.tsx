// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
const m=vi.hoisted(()=>({data:null as any,error:null as any}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'owner'},isLoading:false,isDemoMode:false})}));
vi.mock('../../lib/supabase',()=>({supabase:{rpc:async()=>({data:m.data,error:m.error})}}));
vi.mock('./live',()=>({useRealtimeRefresh:(_t:any,refresh:any)=>{React.useEffect(()=>{refresh();},[]);return 'Live';}}));
vi.mock('react-leaflet',()=>({MapContainer:({children}:any)=><div data-testid="map">{children}</div>,TileLayer:()=>null,CircleMarker:({children}:any)=><div>{children}</div>,Popup:({children}:any)=><div>{children}</div>,Polyline:()=>null,useMapEvents:()=>null}));
import Tracking from './Tracking';
function show(){render(<MemoryRouter initialEntries={['/track/order-1']}><Routes><Route path="/track/:orderId" element={<Tracking/>}/></Routes></MemoryRouter>);}
beforeEach(()=>{m.error=null;m.data={order_id:'order-1',order_status:'ready',delivery_status:'on_the_way',driver_name:'Driver',driver_phone:null,restaurant:{lat:30,lng:31},destination:{lat:30.1,lng:31.1},driver_location:{lat:30.05,lng:31.05,updated_at:'2020-01-01T00:00:00Z'}};});
afterEach(cleanup);
it('warns when a location is stale and renders the real points',async()=>{show();expect(await screen.findByText(/Location is stale/)).toBeTruthy();expect(screen.getByTestId('map')).toBeTruthy();expect(screen.getByText('Restaurant')).toBeTruthy();expect(screen.getByText('Destination')).toBeTruthy();});
it('shows an authorization error without exposing tracking data',async()=>{m.data=null;m.error={message:'not_authorized'};show();expect((await screen.findByRole('alert')).textContent).toContain('not_authorized');expect(screen.queryByTestId('map')).toBeNull();});
