// @vitest-environment jsdom
import React from 'react';
import { describe,it,expect,vi,afterEach } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const m=vi.hoisted(()=>({role:'customer',staff:null as any,driver:false,demo:false}));
vi.mock('../providers',()=>({useAuth:()=>({user:{id:'user',role:m.role,email:'x'},isDemoMode:m.demo,logout:vi.fn()}),useLayout:()=>({restaurantName:'Restaurant',currency:'EGP',currencySymbol:'£'}),useCart:()=>({count:0})}));
vi.mock('../../lib/supabase',()=>({supabase:{from:(table:string)=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:table==='staff_members'?m.staff:m.driver?{is_active:true}:null,error:null})})})})}}));
import { navigationCapabilities } from './navigationAccess';
import { AppLayout } from './AppLayout';
afterEach(()=>{cleanup();m.role='customer';m.staff=null;m.driver=false;m.demo=false;});
describe('role-aware navigation',()=>{
 it('maps staff and overlapping driver roles without granting inactive staff',()=>{
  expect(navigationCapabilities('customer',null,false)).toEqual({dashboard:false,kitchen:false,tables:false,driver:false});
  expect(navigationCapabilities('staff',{role:'chef',is_active:true},true)).toEqual({dashboard:false,kitchen:true,tables:false,driver:true});
  expect(navigationCapabilities('staff',{role:'manager',is_active:true},false)).toEqual({dashboard:true,kitchen:true,tables:true,driver:false});
  expect(navigationCapabilities('staff',{role:'server',is_active:true},false).tables).toBe(true);
  expect(navigationCapabilities('staff',{role:'cashier',is_active:true},false).kitchen).toBe(false);
  expect(navigationCapabilities('staff',{role:'manager',is_active:false},false).dashboard).toBe(false);
  expect(navigationCapabilities('customer',{role:'manager',is_active:true},false).dashboard).toBe(false);
  expect(navigationCapabilities('admin',null,false).tables).toBe(true);
 });
 it('hides Driver from a customer in desktop and mobile',async()=>{
  render(<MemoryRouter><AppLayout/></MemoryRouter>);fireEvent.click(screen.getByLabelText('Toggle navigation menu'));
  await waitFor(()=>expect(screen.queryByText('Driver')).toBeNull());expect(screen.queryByText('Kitchen')).toBeNull();expect(screen.getAllByText('My Orders')).toHaveLength(2);
 });
 it('shows matching driver and chef links on both menus',async()=>{
  m.role='staff';m.staff={role:'chef',is_active:true};m.driver=true;
  render(<MemoryRouter><AppLayout/></MemoryRouter>);fireEvent.click(screen.getByLabelText('Toggle navigation menu'));
  await waitFor(()=>expect(screen.getAllByText('Driver')).toHaveLength(2));expect(screen.getAllByText('Kitchen')).toHaveLength(2);expect(screen.queryByText('Dashboard')).toBeNull();expect(screen.queryByText('Tables')).toBeNull();
 });
});
