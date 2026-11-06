// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';

const mock = vi.hoisted(() => ({ categories: [] as any[], items: [] as any[], saved: [] as any[] }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: (table: string) => {
  let action = 'read'; let payload: any; let id = '';
  const query: any = {
    select: () => query, order: () => query,
    insert: (value: any) => { action = 'insert'; payload = value; return query; },
    update: (value: any) => { action = 'update'; payload = value; return query; },
    eq: (_column: string, value: string) => { id = value; return query; },
    single: async () => { mock.saved.push({ table, action, payload, id }); return { data: { id: id || 'new' }, error: null }; },
    then: (resolve: (value: any) => void) => Promise.resolve({ data: table === 'categories' ? mock.categories : mock.items, error: null }).then(resolve),
  };
  return query;
} } }));
import MenuManagement from './MenuManagement';

describe('menu editor', () => {
  beforeEach(() => { mock.categories = []; mock.items = []; mock.saved = []; });
  afterEach(cleanup);
  it('creates a menu item in piastres and confirms save', async () => {
    render(<MenuManagement />);
    const form = screen.getByRole('heading', { name: 'New menu item' }).parentElement!;
    fireEvent.change(within(form).getByLabelText('Name'), { target: { value: 'Test dish' } });
    fireEvent.change(within(form).getByLabelText('Price (EGP)'), { target: { value: '123.45' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save item' }));
    await screen.findByText('Menu item saved to Supabase.');
    expect(mock.saved[0]).toMatchObject({ table: 'menu_items', action: 'insert', payload: { name: 'Test dish', price: 12345 } });
  });
  it('loads an existing item for editing and sends an update', async () => {
    mock.items = [{ id: 'item-1', name: 'Burger', description: null, category_id: null, price: 12000, image_url: null, is_available: true }];
    render(<MenuManagement />);
    await screen.findByText('Burger');
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    const form = screen.getByRole('heading', { name: 'Edit menu item' }).parentElement!;
    fireEvent.change(within(form).getByLabelText('Price (EGP)'), { target: { value: '130.00' } });
    fireEvent.click(within(form).getByRole('button', { name: 'Save item' }));
    await waitFor(() => expect(mock.saved[0]).toMatchObject({ table: 'menu_items', action: 'update', id: 'item-1', payload: { price: 13000 } }));
  });
});
