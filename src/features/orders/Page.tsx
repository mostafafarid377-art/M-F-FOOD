import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ButtonLink, Badge, Button, Card, statusVariant } from "../../components/ui";
import { Pagination } from "../../components/Pagination";
import { formatEGP } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { useAuth, useLayout } from "../../app/providers";
import { loadDemoOrders, type DemoOrder } from "../checkout/Page";
import { tr, useArabic } from "../phase5/Shell";
import type { OrderStatus, OrderWithItems } from "../../types/supabase";

type DisplayOrder = {
  id: string;
  created_at: string;
  status: OrderStatus | "pending";
  total_price: number;
  delivery_address: string | null;
  notes: string | null;
  phone: string | null;
  payment: {status:string;provider:string|null;payment_method:string|null} | null;
  table_number: number | null;
  demo: boolean;
  lines: { name: string; quantity: number; price_at_order: number }[];
};

function fromRow(row: OrderWithItems & { delivery_details: {phone:string} | null; payments: {status:string;provider:string|null;payment_method:string|null} | null }): DisplayOrder {
  return {
    id: row.id,
    created_at: row.created_at,
    status: row.status,
    total_price: row.total_price,
    delivery_address: row.delivery_address,
    notes: row.notes,
    phone: row.delivery_details?.phone ?? null,
    payment: row.payments ?? null,
    table_number: row.table_number,
    demo: false,
    lines: row.order_items.map((item) => ({
      name: item.menu_items?.name ?? "Removed item",
      quantity: item.quantity,
      price_at_order: item.price_at_order,
    })),
  };
}

function fromDemo(order: DemoOrder): DisplayOrder {
  return {
    id: order.id,
    created_at: order.created_at,
    status: order.status,
    total_price: order.total_price,
    delivery_address: order.delivery_address,
    notes: order.notes ?? null,
    phone: order.delivery_details?.phone ?? null,
    payment: null,
    table_number: order.table_number,
    demo: true,
    lines: order.items,
  };
}

/**
 * Order history — customers only ever see their own orders (enforced by RLS
 * when Supabase is connected).
 */
export default function OrdersPage() {
  const {user} = useAuth();
  return <OrdersSession key={user?.id ?? "signed-out"} />;
}

function OrdersSession() {
  const { user, isDemoMode } = useAuth();
  const ar = useArabic();
  const { currencySymbol } = useLayout();
  const location = useLocation();
  const placedId = (location.state as { placed?: string } | null)?.placed;

  const [orders, setOrders] = useState<DisplayOrder[] | null>(null);
  const [page,setPage]=useState(0);const [hasNext,setHasNext]=useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let request = 0;
    async function load() {
      if (!user) return;
      const current = ++request;
      if (!supabase) {
        const rows=loadDemoOrders().filter(order => order.customer_id === user.id);setHasNext(rows.length>(page+1)*50);setOrders(rows.slice(page*50,(page+1)*50).map(fromDemo));
        return;
      }
      const { data, error: fetchError } = await supabase
        .from("orders")
        .select("*, order_items(*, menu_items(name)), delivery_details(phone), payments(status,provider,payment_method)")
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false }).order("id", { ascending: false }).range(page*50,page*50+50);

      if (cancelled || current !== request) return;
      if (fetchError) {
        setError(fetchError.message);
        setOrders([]);
      } else {
        setError(null);setHasNext((data?.length ?? 0)>50);
        setOrders(((data ?? []).slice(0,50) as unknown as (OrderWithItems & { delivery_details: {phone:string} | null; payments: {status:string;provider:string|null;payment_method:string|null} | null })[]).map(fromRow));
      }
    }

    void load();
    if(!supabase || !user) return () => { cancelled = true; };
    const channel = supabase.channel(`customer-orders-${user.id}`).on('postgres_changes',{event:'*',schema:'public',table:'orders',filter:`customer_id=eq.${user.id}`},()=>void load()).subscribe(status=>{if(status==='SUBSCRIBED')void load();});
    const poll=setInterval(()=>void load(),20000);
    const online=()=>void load();window.addEventListener('online',online);
    return () => {cancelled=true;request++;clearInterval(poll);window.removeEventListener('online',online);void supabase?.removeChannel(channel);};
  }, [user?.id, placedId,page]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-6xl">📋</p>
        <h1 className="mt-4 text-2xl font-bold text-primary">{tr(ar,'Login required','يجب تسجيل الدخول')}</h1>
        <p className="mt-2 text-gray-500">{tr(ar,'Log in to see your order history.','سجّل الدخول لعرض سجل الطلبات.')}</p>
        <div className="mt-6 flex justify-center gap-3">
          <ButtonLink to="/login" state={{ from: "/orders" }} size="lg">{tr(ar,'Login','دخول')}</ButtonLink>
          <ButtonLink to="/register" state={{ from: "/orders" }} size="lg" variant="outline">Register
            </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-primary">{tr(ar,'My Orders','طلباتي')}</h1>

      {placedId && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <p className="font-semibold text-green-800">{tr(ar,'✅ Order placed successfully!','✅ تم إرسال الطلب بنجاح!')}</p>
          <p className="text-sm text-green-700">
            Reference <span className="font-mono">{placedId.slice(0, 8)}</span> — the
            kitchen will confirm it shortly.
          </p>
        </Card>
      )}

      {error && (
        <p role="alert" className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Couldn't load orders: {error}
        </p>
      )}

      {orders === null ? (
        <div className="space-y-3">
          {[1, 2].map((n) => (
            <Card key={n} className="animate-pulse">
              <div className="h-4 w-1/3 rounded bg-primary-100" />
              <div className="mt-3 h-3 w-2/3 rounded bg-gray-100" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-100" />
            </Card>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <Card className="py-12 text-center">
          <p className="text-4xl">🧾</p>
          <p className="mt-2 font-medium text-gray-700">{tr(ar,'No orders yet','لا توجد طلبات بعد')}</p>
          <p className="text-sm text-gray-500">{tr(ar,'Your placed orders will appear here.','ستظهر طلباتك هنا.')}</p>
          <ButtonLink to="/menu" className={["mt-4 inline-block"].filter(Boolean).join(' ')}>{tr(ar,'Start an order','ابدأ طلباً')}</ButtonLink>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono text-sm text-gray-500">
                    #{order.id.slice(0, 8)}
                    {order.demo && (
                      <Badge variant="warning" className="ml-2">
                        demo
                      </Badge>
                    )}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(order.created_at).toLocaleString()}
                  </p>
                </div>
                <Badge variant={statusVariant(order.status)} dot>
                  {order.status === "confirmed" ? "accepted" : order.status}
                </Badge>
              </div>

              <ul className="mt-3 divide-y divide-gray-100 border-t border-gray-100">
                {order.lines.map((line, idx) => (
                  <li key={idx} className="flex justify-between py-1.5 text-sm">
                    <span>
                      {line.name} <span className="text-gray-400">× {line.quantity}</span>
                    </span>
                    <span className="font-medium">
                      {formatEGP(line.price_at_order * line.quantity, currencySymbol)}
                    </span>
                  </li>
                ))}
              </ul>

              {order.payment && <p className="mt-3 text-sm">{tr(ar,'Payment','الدفع')}: {order.payment.payment_method === 'cash' ? tr(ar,'Cash','نقداً') : 'Paymob'} · {({pending:tr(ar,'Pending','قيد الانتظار'),processing:tr(ar,'Processing','قيد المعالجة'),paid:tr(ar,'Paid','مدفوع'),failed:tr(ar,'Failed','فشل'),cancelled:tr(ar,'Cancelled','ملغي'),refunded:tr(ar,'Refunded','مسترد')} as Record<string,string>)[order.payment.status] || order.payment.status} {order.payment.provider === 'paymob' && <Link className="text-primary underline" to={`/payment/${order.id}`}>{tr(ar,'Payment details','تفاصيل الدفع')}</Link>}</p>}
              {order.phone && <p className="mt-3 text-sm text-gray-600">{tr(ar,'Delivery phone','هاتف التوصيل')}: {order.phone}</p>}
              {order.notes && <p className="mt-3 text-sm text-gray-600">{tr(ar,'Delivery instructions','تعليمات التوصيل')}: {order.notes}</p>}
              {!order.demo && order.delivery_address && <Link className="mt-3 inline-block text-sm font-semibold text-primary underline" to={`/track/${order.id}`}>{tr(ar,'Track delivery','تتبع التوصيل')}</Link>}
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-gray-100 pt-2">
                <p className="text-xs text-gray-500">
                  {order.delivery_address
                    ? `🛵 ${order.delivery_address}`
                    : order.table_number
                      ? `🍽️ Table ${order.table_number}`
                      : ""}
                </p>
                <p className="font-extrabold text-primary">
                  {tr(ar,'Total','الإجمالي')} {formatEGP(order.total_price, currencySymbol)}
                </p>
              </div>
            </Card>
          ))}
        </div>
      )}
      <Pagination label={tr(ar,'Order history pages','صفحات سجل الطلبات')} page={page} hasNext={hasNext} onChange={setPage} />
    </div>
  );
}
