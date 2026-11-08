import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/Pagination';
import { ButtonLink, Button, Card } from '../../components/ui';
import { useManagementAccess } from './access';
import { changeStatus, nextStatus, statusLabel, useLiveOrders, type ManagedOrder } from './orders';

export default function Kitchen() {
  const { orders, error, loading, connection, refresh, page, setPage, hasNext } = useLiveOrders(true);
  const access = useManagementAccess();
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(id); }, []);
  const advance = async (order: ManagedOrder) => {
    const next = nextStatus(order.status); if (!next) return;
    setBusy(order.id); setActionError('');
    try { await changeStatus(order, next); await refresh(); } catch (e) { setActionError(e instanceof Error ? e.message : 'Unable to update order'); await refresh(); } finally { setBusy(''); }
  };
  const columns = [
    { label: 'Pending', statuses: ['pending', 'confirmed'] },
    { label: 'Preparing', statuses: ['preparing'] },
    { label: 'Ready', statuses: ['ready'] },
  ];
  return <div className="mx-auto max-w-[1800px] px-4 py-6">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-widest text-primary">M-F-FOOD / Kitchen</p><h1 className="text-3xl font-bold">Kitchen display</h1><p className="text-sm text-gray-500">{connection} · automatically reconciles every 20 seconds</p></div><div className="flex gap-2">{(access === 'manager' || access === 'admin') && <ButtonLink to="/admin" variant="outline">Dashboard</ButtonLink>}<Button variant="outline" onClick={() => void refresh()}>Refresh</Button></div></div>
    {(error || actionError) && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-700">{error || actionError}</p>}
    {loading && <p>Loading orders…</p>}
    <p className="mb-2 text-sm">Showing one page of active orders. Check all pages for outstanding orders.</p>
    <Pagination label="Active order pages" page={page} hasNext={hasNext} onChange={setPage} />
    <div className="mt-4 grid items-start gap-4 md:grid-cols-3">{columns.map(column => <section key={column.label} className="rounded-xl bg-orange-50 p-3"><h2 className="mb-3 text-xl font-bold">{column.label} <span className="text-sm text-gray-500">({orders.filter(o => column.statuses.includes(o.status)).length})</span></h2>
      <div className="space-y-3">{orders.filter(o => column.statuses.includes(o.status)).map(order => {
        const minutes = Math.max(0, Math.floor((now - new Date(order.created_at).getTime()) / 60000));
        const next = nextStatus(order.status);
        return <Card key={order.id} className={`p-4 ${minutes >= 20 ? 'ring-2 ring-red-500' : order.status === 'pending' ? 'ring-2 ring-amber-400' : ''}`}>
          <div className="flex items-start justify-between gap-2"><div><h3 className="font-bold">#{order.id.slice(0, 8)}</h3><p className="text-sm text-gray-500">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {minutes} min elapsed</p></div><span className={`rounded-full px-2 py-1 text-xs font-bold ${minutes >= 20 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>{minutes >= 20 ? 'Delayed' : order.status === 'pending' ? 'New' : statusLabel(order.status)}</span></div>
          <ul className="my-4 space-y-2 text-lg font-semibold">{order.order_items.map(item => <li key={item.id}>{item.quantity} × {item.menu_items?.name ?? 'Removed item'}</li>)}</ul>
          {order.notes && <p className="mb-3 rounded bg-yellow-50 p-2 text-sm"><strong>Instructions:</strong> {order.notes}</p>}
          {order.table_number && <p className="mb-3 text-sm">Table {order.table_number}</p>}
          {next && (next !== 'completed' || access === 'manager' || access === 'admin') && <Button size="lg" fullWidth disabled={busy === order.id} onClick={() => void advance(order)}>{busy === order.id ? 'Updating…' : `Mark ${statusLabel(next)}`}</Button>}
        </Card>;
      })}{!orders.some(o => column.statuses.includes(o.status)) && <p className="py-6 text-center text-sm text-gray-500">No orders</p>}</div>
    </section>)}</div>
  </div>;
}
