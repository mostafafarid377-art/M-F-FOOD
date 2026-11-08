// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../../lib/supabase', () => ({ supabase: null, isSupabaseConfigured: false }));
import { CartProvider } from '../../app/providers';
import CartPage from './Page';

const itemName = 'Chicken Pasta with a Very Long Name That Must Remain Readable';
function showCart() {
  return render(<CartProvider><MemoryRouter initialEntries={['/cart']}><Routes><Route path="/cart" element={<CartPage />} /><Route path="/checkout" element={<p>Checkout page</p>} /></Routes></MemoryRouter></CartProvider>);
}
beforeEach(() => {
  localStorage.setItem('mf-food-cart', JSON.stringify([
    { id:'1', name:itemName, price:9500, quantity:1, image:'/images/one.jpg' },
    { id:'2', name:'Pasta', price:14500, quantity:1, image:'/images/two.jpg' },
  ]));
});
afterEach(() => { cleanup(); localStorage.clear(); });

it('shows complete item names and provides quantity, totals and removal controls', () => {
  showCart();
  expect(screen.getByText(itemName).className).not.toContain('truncate');
  const quantity = screen.getByLabelText(`Quantity of ${itemName}`);
  expect(quantity.textContent).toBe('1');
  fireEvent.click(screen.getByRole('button', {name:`Increase quantity of ${itemName}`}));
  expect(quantity.textContent).toBe('2');
  expect(screen.getByText('£190.00')).toBeTruthy();
  expect(screen.getAllByText('£335.00')).toHaveLength(2);
  fireEvent.click(screen.getByRole('button', {name:`Decrease quantity of ${itemName}`}));
  expect(quantity.textContent).toBe('1');
  fireEvent.click(screen.getByRole('button', {name:`Remove ${itemName} from cart`}));
  expect(screen.queryByText(itemName)).toBeNull();
  expect(screen.getAllByText('£145.00')).toHaveLength(3);
});

it('preserves the image column when an image fails to load', () => {
  showCart();
  const image = screen.getByAltText(itemName) as HTMLImageElement;
  fireEvent.error(image);
  expect(image.style.visibility).toBe('hidden');
  expect(image.style.display).not.toBe('none');
});

it('keeps clear cart, empty state and checkout navigation working', () => {
  const view=showCart();
  fireEvent.click(screen.getByRole('button', {name:'Proceed to Checkout'}));
  expect(screen.getByText('Checkout page')).toBeTruthy();
  view.unmount();
  localStorage.setItem('mf-food-cart', JSON.stringify([{id:'2',name:'Pasta',price:14500,quantity:1}]));
  showCart();
  fireEvent.click(screen.getByRole('button', {name:'Clear cart'}));
  const empty=screen.getByText('Your cart is empty').parentElement!;
  expect(within(empty).getByRole('link', {name:'Browse Menu'})).toBeTruthy();
});
