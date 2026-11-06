import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useLayout } from '../../app/providers';
import { Button, Card } from '../../components/ui';
import { formatEGP } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import type { OrderStatus } from '../../types/supabase';
import { useManagementAccess } from './access';
import MenuManagement from './MenuManagement';
import StaffManagement from './Staff';
import { changeStatus, nextStatus, statusLabel, useLiveOrders, type ManagedOrder } from './orders';

type History = { id: string; old_status: string | null; new_status: string; created_at: string; changed_by: string | null };
const tabs = ['overview', 'orders', 'menu', 'staff'] as const;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

function OrderDetails({ order, refresh }: { order: ManagedOrder; refresh: () => Promise<void> }) {
  const { currencySymbol } = useLayout();
  const [history, setHistory] = useState<History[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  useEffect(() => { let active = true; if (supabase) supabase.from('order_status_history').select('id,old_status,new_status,created_at,changed_by').eq('order_id', order.id).order('created_at', { ascending: true }).then(({ data, error: err }) => { if (!active) return; if (err) setError(err.message); else setHistory(data as History[]); }); return () => { active = false; }; }, [order.id, order.status]);
  const update = async (next: OrderStatus) => { if (next === 'cancelled' && !window.confirm('Cancel this order?')) return; setBusy(true); setError(''); try { await changeStatus(order, next); await refresh(); } catch (e) { setError(e instanceof Error ? e.message : 'Status update failed'); await refresh(); } finally { setBusy(false); } };
  const next = nextStatus(order.status);
  return <div className="mt-4 border-t pt-4"><div className="grid gap-3 sm:grid-cols-2"><div><p className="font-semibold">Customer</p><p>{order.profiles?.full_name || 'Unknown customer'}</p><p>{order.profiles?.phone || 'No phone provided'}</p><p>{order.delivery_address || (order.table_number ? `Table ${order.table_number}` : 'No fulfilment details')}</p></div><div><p className="font-semibold">Items</p><ul>{order.order_items.map(item => <li key={item.id}>{item.quantity} × {item.menu_items?.name ?? 'Removed item'} · {formatEGP(item.price_at_order * item.quantity, currencySymbol)}</li>)}</ul><p className="mt-1 font-bold">Total: {formatEGP(order.total_price, currencySymbol)}</p></div></div>
    {order.notes && <p className="mt-3 rounded bg-amber-50 p-2">Instructions: {order.notes}</p>}
    <div className="mt-4 flex flex-wrap gap-2">{next && <Button disabled={busy} onClick={() => void update(next)}>Mark {statusLabel(next)}</Button>}{['pending', 'confirmed', 'preparing'].includes(order.status) && <Button variant="danger" disabled={busy} onClick={() => void update('cancelled')}>Cancel order</Button>}</div>
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
    <h4 className="mt-4 font-semibold">Status history</h4>{history.length ? <ol className="mt-1 space-y-1 text-sm text-gray-600">{history.map(h => <li key={h.id}>{new Date(h.created_at).toLocaleString()} · {h.old_status ? `${statusLabel(h.old_status)} → ` : ''}{statusLabel(h.new_status)}{h.changed_by ? ` · ${h.changed_by.slice(0, 8)}` : ''}</li>)}</ol> : <p className="text-sm text-gray-500">No recorded changes yet (orders created before Phase 4 have no initial history entry).</p>}
  </div>;
}

export default function Dashboard() {
  const access = useManagementAccess(); const { currencySymbol } = useLayout();
  const { orders, loading, error, connection, refresh } = useLiveOrders(false);
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab'); const tab = tabs.includes(requested as typeof tabs[number]) && !(requested === 'staff' && access !== 'admin') ? requested : 'overview';
  const [search, setSearch] = useState(''); const [status, setStatus] = useState(''); const [date, setDate] = useState(''); const [expanded, setExpanded] = useState('');
  const filtered = useMemo(() => orders.filter(o => o.id.toLowerCase().includes(search.toLowerCase().trim()) && (!status || o.status === status) && (!date || dateKey(new Date(o.created_at)) === date)), [orders, search, status, date]);
  const today = dateKey(new Date());
  const sales = orders.filter(o => o.status === 'completed' && dateKey(new Date(o.updated_at)) === today).reduce((sum, o) => sum + o.total_price, 0);
  const stats = [ ['Total orders', orders.length], ['Pending orders', orders.filter(o => o.status === 'pending').length], ['Preparing orders', orders.filter(o => o.status === 'preparing').length], ['Completed orders', orders.filter(o => o.status === 'completed').length], ["Today's sales", formatEGP(sales, currencySymbol)] ];
  const orderList = (list: ManagedOrder[]) => <div className="space-y-3">{list.map(order => <Card key={order.id} className="p-4"><div className="flex flex-wrap items-center justify-between gap-3"><button className="text-left" aria-expanded={expanded === order.id} onClick={() => setExpanded(expanded === order.id ? '' : order.id)}><strong>#{order.id.slice(0, 8)}</strong> <span className="text-sm text-gray-500">{new Date(order.created_at).toLocaleString()}</span><p className="text-sm text-gray-500">{order.profiles?.full_name || 'Unknown customer'} · {order.order_items.length} line(s)</p></button><div className="flex items-center gap-3"><span className="rounded-full bg-orange-100 px-3 py-1 text-sm font-semibold text-orange-800">{statusLabel(order.status)}</span><strong>{formatEGP(order.total_price, currencySymbol)}</strong><Button variant="outline" size="sm" onClick={() => setExpanded(expanded === order.id ? '' : order.id)}>{expanded === order.id ? 'Close' : 'Details'}</Button></div></div>{expanded === order.id && <OrderDetails order={order} refresh={refresh} />}</Card>)}{!list.length && !loading && <p className="py-8 text-center text-gray-500">No orders found.</p>}</div>;
  return <div className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-widest text-primary">M-F-FOOD / {access}</p><h1 className="text-3xl font-bold">Restaurant dashboard</h1><p className="text-sm text-gray-500">Orders: {connection}</p></div><div className="flex flex-wrap gap-2"><Link to="/tables"><Button variant="outline">Tables</Button></Link><Link to="/delivery-admin"><Button variant="outline">Delivery</Button></Link><Link to="/kitchen"><Button>Open kitchen display</Button></Link></div></div>
    <nav aria-label="Dashboard sections" className="mb-6 flex flex-wrap gap-2">{tabs.filter(t => t !== 'staff' || access === 'admin').map(t => <Button key={t} variant={tab === t ? 'primary' : 'outline'} onClick={() => setParams({ tab: t })}>{statusLabel(t)}</Button>)}</nav>
    {error && <p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}{loading && <p className="mb-4">Loading orders…</p>}
    {tab === 'overview' && <><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">{stats.map(([label, value]) => <Card key={label} className="p-4"><p className="text-sm text-gray-500">{label}</p><p className="mt-1 text-2xl font-bold">{value}</p></Card>)}</div><p className="mt-2 text-xs text-gray-500">Today's sales is the value of orders marked completed today in your browser's local time; it is not a payment total.</p><h2 className="mb-3 mt-8 text-xl font-bold">Recent orders</h2>{orderList(orders.slice(0, 8))}</>}
    {tab === 'orders' && <><div className="mb-4 grid gap-3 sm:grid-cols-3"><label className="text-sm">Order number / UUID<input className="mt-1 w-full rounded border p-2" placeholder="Search order ID" value={search} onChange={e => setSearch(e.target.value)} /></label><label className="text-sm">Status<select className="mt-1 w-full rounded border p-2" value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{['pending','confirmed','preparing','ready','completed','cancelled'].map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}</select></label><label className="text-sm">Order date<input className="mt-1 w-full rounded border p-2" type="date" value={date} onChange={e => setDate(e.target.value)} /></label></div>{orderList(filtered)}</>}
    {tab === 'menu' && <MenuManagement />}{tab === 'staff' && access === 'admin' && <StaffManagement />}
  </div>;
}
