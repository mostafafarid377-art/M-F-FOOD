// @vitest-environment jsdom
import React, { useState } from 'react';
import { afterEach,expect,it,vi } from 'vitest';
import { act,cleanup,fireEvent,render,screen } from '@testing-library/react';
const m=vi.hoisted(()=>({click:null as any,setView:vi.fn()}));
vi.mock('react-leaflet',()=>({MapContainer:({children}:any)=><div>{children}</div>,TileLayer:()=>null,CircleMarker:()=>null,useMapEvents:(handlers:any)=>{m.click=handlers.click;},useMap:()=>({setView:m.setView,getZoom:()=>12})}));
import DeliveryMap, { type DeliveryPoint } from './DeliveryMap';
function Wrapper(){const [point,setPoint]=useState<DeliveryPoint|null>(null);return <DeliveryMap value={point} onChange={setPoint}/>;}
afterEach(()=>{cleanup();vi.clearAllMocks();});
it('starts without a destination and allows a manual map pin',()=>{
 render(<Wrapper/>);expect(screen.getByText('No location selected yet.')).toBeTruthy();act(()=>m.click({latlng:{lat:30.123456,lng:31.234567}}));expect(screen.getByText(/Selected: 30.12346, 31.23457/)).toBeTruthy();
});
it('keeps manual selection available when geolocation is denied',()=>{
 Object.defineProperty(window,'isSecureContext',{value:true,configurable:true});Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition:(_success:any,error:any)=>error({code:1})},configurable:true});render(<Wrapper/>);fireEvent.click(screen.getByText('Use my current location'));expect(screen.getByText(/permission was denied/)).toBeTruthy();act(()=>m.click({latlng:{lat:30,lng:31}}));expect(screen.getByText('Selected: 30.00000, 31.00000')).toBeTruthy();
});
it('can select coordinates when map tiles cannot load',()=>{
 render(<Wrapper/>);fireEvent.change(screen.getByLabelText('Latitude'),{target:{value:'30.1'}});fireEvent.change(screen.getByLabelText('Longitude'),{target:{value:'31.2'}});fireEvent.click(screen.getByText('Set coordinates'));expect(screen.getByText('Selected: 30.10000, 31.20000')).toBeTruthy();
});

it('shows a non-interactive saved-location preview',()=>{
 m.click=null;const onChange=vi.fn();render(<DeliveryMap value={{lat:30,lng:31}} onChange={onChange} readOnly />);
 expect(m.click).toBeNull();expect(screen.queryByText('Use my current location')).toBeNull();
 expect(onChange).not.toHaveBeenCalled();expect(m.setView).toHaveBeenCalled();
});
