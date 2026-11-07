// @vitest-environment jsdom
import React from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
const state=vi.hoisted(()=>({role:'server'}));
vi.mock('./access',()=>({useManagementAccess:()=>state.role}));
vi.mock('./orders',()=>({useLiveOrders:()=>({orders:[{id:'order-1',status:'ready',created_at:new Date().toISOString(),order_items:[]}],error:'',loading:false,connection:'Live',refresh:vi.fn()}),changeStatus:vi.fn(),nextStatus:()=> 'completed',statusLabel:(s:string)=>s}));
import Kitchen from './Kitchen';
afterEach(cleanup);
it.each(['chef','server','cashier'])('hides dashboard and completion controls for %s',role=>{state.role=role;render(<MemoryRouter><Kitchen/></MemoryRouter>);expect(screen.queryByText('Dashboard')).toBeNull();expect(screen.queryByText('Mark completed')).toBeNull();});
it('shows manager controls',()=>{state.role='manager';render(<MemoryRouter><Kitchen/></MemoryRouter>);expect(screen.getByText('Dashboard')).toBeTruthy();expect(screen.getByText('Mark completed')).toBeTruthy();});
