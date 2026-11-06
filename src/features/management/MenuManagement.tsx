import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import type { CategoryRow, MenuItemRow } from '../../types/supabase';
import { formatEGP } from '../../lib/format';

const field = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2';
type CategoryForm = { id: string; name: string; description: string; is_visible: boolean };
type ItemForm = { id: string; name: string; description: string; category_id: string; price: string; image_url: string; is_available: boolean };
const emptyCategory: CategoryForm = { id: '', name: '', description: '', is_visible: true };
const emptyItem: ItemForm = { id: '', name: '', description: '', category_id: '', price: '', image_url: '', is_available: true };

export default function MenuManagement() {
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [items, setItems] = useState<MenuItemRow[]>([]);
  const [category, setCategory] = useState<CategoryForm>(emptyCategory);
  const [item, setItem] = useState<ItemForm>(emptyItem);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    if (!supabase) return;
    const [c, i] = await Promise.all([supabase.from('categories').select('*').order('sort_order').order('name'), supabase.from('menu_items').select('*').order('name')]);
    if (c.error || i.error) { setError(c.error?.message ?? i.error?.message ?? 'Unable to load menu'); return; }
    setCategories(c.data as CategoryRow[]); setItems(i.data as MenuItemRow[]);
  }, []);
  useEffect(() => { void load(); }, [load]);
  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supabase || busy) return; setBusy(true); setError(''); setNotice('');
    const payload = { name: category.name.trim(), description: category.description.trim() || null, is_visible: category.is_visible };
    const result = category.id ? await supabase.from('categories').update(payload).eq('id', category.id).select('id').single() : await supabase.from('categories').insert(payload).select('id').single();
    if (result.error) setError(result.error.message); else { setCategory(emptyCategory); setNotice('Category saved to Supabase.'); await load(); }
    setBusy(false);
  };
  const saveItem = async (e: React.FormEvent) => {
    e.preventDefault(); if (!supabase || busy) return;
    if (!/^\d+(\.\d{1,2})?$/.test(item.price)) { setError('Enter a valid EGP price with at most two decimal places.'); return; }
    const [major, minor = ''] = item.price.split('.'); const price = Number(major) * 100 + Number(minor.padEnd(2, '0'));
    if (!Number.isSafeInteger(price) || price > 2147483647) { setError('Price is too large.'); return; }
    setBusy(true); setError(''); setNotice('');
    const payload = { name: item.name.trim(), description: item.description.trim() || null, category_id: item.category_id || null, price, image_url: item.image_url.trim() || null, is_available: item.is_available };
    const result = item.id ? await supabase.from('menu_items').update(payload).eq('id', item.id).select('id').single() : await supabase.from('menu_items').insert(payload).select('id').single();
    if (result.error) setError(result.error.message); else { setItem(emptyItem); setNotice('Menu item saved to Supabase.'); await load(); }
    setBusy(false);
  };
  const deleteCategory = async (c: CategoryRow) => {
    if (!supabase || !window.confirm(`Delete category "${c.name}"? Its items will be uncategorized.`)) return;
    setError(''); setNotice(''); const { error: err, data } = await supabase.from('categories').delete().eq('id', c.id).select('id');
    if (err || !data?.length) setError(err?.message ?? 'Category was not deleted.'); else { setNotice('Category deleted.'); await load(); }
  };
  return <div className="space-y-6">
    {error && <p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}{notice && <p role="status" className="rounded bg-green-50 p-3 text-green-700">{notice}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="p-5"><h2 className="mb-4 text-xl font-bold">{category.id ? 'Edit category' : 'New category'}</h2><form className="space-y-3" onSubmit={saveCategory}>
        <label className="block text-sm font-medium">Name<input required maxLength={120} className={field} value={category.name} onChange={e => setCategory({ ...category, name: e.target.value })} /></label>
        <label className="block text-sm font-medium">Description<textarea className={field} value={category.description} onChange={e => setCategory({ ...category, description: e.target.value })} /></label>
        <label className="flex gap-2"><input type="checkbox" checked={category.is_visible} onChange={e => setCategory({ ...category, is_visible: e.target.checked })} /> Visible to customers</label>
        <div className="flex gap-2"><Button type="submit" disabled={busy || !category.name.trim()}>Save category</Button>{category.id && <Button variant="ghost" onClick={() => setCategory(emptyCategory)}>Cancel</Button>}</div>
      </form><div className="mt-5 divide-y">{categories.map(c => <div key={c.id} className="flex items-center justify-between gap-2 py-3"><div><strong>{c.name}</strong><p className="text-sm text-gray-500">{c.is_visible ? 'Visible' : 'Hidden'}</p></div><div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => setCategory({ id: c.id, name: c.name, description: c.description ?? '', is_visible: c.is_visible })}>Edit</Button><Button variant="danger" size="sm" onClick={() => void deleteCategory(c)}>Delete</Button></div></div>)}</div></Card>
      <Card className="p-5"><h2 className="mb-4 text-xl font-bold">{item.id ? 'Edit menu item' : 'New menu item'}</h2><form className="space-y-3" onSubmit={saveItem}>
        <label className="block text-sm font-medium">Name<input required maxLength={120} className={field} value={item.name} onChange={e => setItem({ ...item, name: e.target.value })} /></label>
        <label className="block text-sm font-medium">Description<textarea className={field} value={item.description} onChange={e => setItem({ ...item, description: e.target.value })} /></label>
        <label className="block text-sm font-medium">Category<select className={field} value={item.category_id} onChange={e => setItem({ ...item, category_id: e.target.value })}><option value="">Uncategorized</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <label className="block text-sm font-medium">Price (EGP)<input required inputMode="decimal" placeholder="125.00" className={field} value={item.price} onChange={e => setItem({ ...item, price: e.target.value })} /></label>
        <label className="block text-sm font-medium">Image URL or /images/ path<input className={field} value={item.image_url} onChange={e => setItem({ ...item, image_url: e.target.value })} /></label>
        <label className="flex gap-2"><input type="checkbox" checked={item.is_available} onChange={e => setItem({ ...item, is_available: e.target.checked })} /> Available to customers</label>
        <div className="flex gap-2"><Button type="submit" disabled={busy || !item.name.trim()}>Save item</Button>{item.id && <Button variant="ghost" onClick={() => setItem(emptyItem)}>Cancel</Button>}</div>
      </form><div className="mt-5 divide-y">{items.map(i => <div key={i.id} className="flex items-center justify-between gap-2 py-3"><div><strong>{i.name}</strong><p className="text-sm text-gray-500">{formatEGP(i.price)} · {i.is_available ? 'Available' : 'Unavailable'}</p></div><Button variant="ghost" size="sm" onClick={() => setItem({ id: i.id, name: i.name, description: i.description ?? '', category_id: i.category_id ?? '', price: (i.price / 100).toFixed(2), image_url: i.image_url ?? '', is_available: i.is_available })}>Edit</Button></div>)}</div></Card>
    </div>
    <p className="text-sm text-gray-500">Modifiers are not supported by the existing database schema and are not changed in this phase.</p>
  </div>;
}
