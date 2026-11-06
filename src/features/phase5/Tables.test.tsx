// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({calls:[] as any[]}));
vi.mock('../../app/providers',()=>({useAuth:()=>({user:{id:'admin',role:'admin'},isLoading:false,isDemoMode:false}),useLayout:()=>({currencySymbol:'£'})}));
vi.mock('../../lib/supabase',()=>({supabase:{from:(table:string)=>{const q:any={select:()=>q,order:()=>q,is:()=>q,range:()=>q,in:()=>q,then:(f:any)=>Promise.resolve({data:table==='restaurant_tables'?[{id:'t1',table_number:1,name:'Window',status:'available',is_active:true}]:[],error:null}).then(f)};return q;},rpc:async(name:string,args:any)=>{m.calls.push({name,args});return {error:null};}}}));
vi.mock('./live',()=>({useRealtimeRefresh:(_t:any,refresh:any)=>{React.useEffect(()=>{refresh();},[]);return 'Live';}}));
import Tables from './Tables';
afterEach(()=>{cleanup();m.calls=[];});
it('opens an available table through the server RPC',async()=>{render(<MemoryRouter><Tables/></MemoryRouter>);const button=await screen.findByRole('button',{name:'Open session'});fireEvent.click(button);await waitFor(()=>expect(m.calls).toContainEqual({name:'open_dining_session',args:{p_table_id:'t1'}}));});
it('saves a table through the server RPC',async()=>{render(<MemoryRouter><Tables/></MemoryRouter>);fireEvent.change(screen.getByLabelText('Number'),{target:{value:'2'}});fireEvent.change(screen.getByLabelText('Name'),{target:{value:'Patio'}});fireEvent.click(screen.getByRole('button',{name:'Save'}));await waitFor(()=>expect(m.calls).toContainEqual({name:'save_restaurant_table',args:{p_id:null,p_number:2,p_name:'Patio',p_status:'available',p_active:true}}));});
