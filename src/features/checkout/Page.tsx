import React, { Suspense, useEffect, useRef, useState } from "react";
import { tr, useArabic } from "../phase5/Shell";
import type { DeliveryPoint } from "./DeliveryMap";
const DeliveryMap = React.lazy(() => import("./DeliveryMap"));
import { Link, useNavigate } from "react-router-dom";
import { Badge, Button, Card } from "../../components/ui";
import { formatEGP } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { useAuth, useCart, useLayout } from "../../app/providers";
import type { CreateOrderItemInput } from "../../types/supabase";

const DEMO_ORDERS_KEY = "mf-food-demo-orders";

export interface DemoOrder {
  id: string;
  created_at: string;
  status: "pending";
  total_price: number;
  delivery_address: string | null;
  notes?: string | null;
  delivery_details?: { building: string; apartment: string; floor: string; street: string; phone: string; destination: DeliveryPoint } | null;
  table_number: number | null;
  demo: true;
  items: { name: string; quantity: number; price_at_order: number }[];
}

export function saveDemoOrder(order: DemoOrder) {
  try {
    const existing = JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) ?? "[]") as DemoOrder[];
    existing.unshift(order);
    localStorage.setItem(DEMO_ORDERS_KEY, JSON.stringify(existing));
  } catch {
    /* ignore storage errors in demo mode */
  }
}

export function loadDemoOrders(): DemoOrder[] {
  try {
    return JSON.parse(localStorage.getItem(DEMO_ORDERS_KEY) ?? "[]") as DemoOrder[];
  } catch {
    return [];
  }
}

/**
 * Checkout — Phase 3 order creation.
 *
 * The frontend sends ONLY menu item ids + quantities to the `create_order`
 * Postgres function. Prices, availability, minimum-order rules and totals
 * are all computed and enforced server-side; nothing the client submits
 * about money is trusted.
 */
export default function CheckoutPage() {
  const navigate = useNavigate();
  const ar = useArabic();
  const inFlight = useRef(false);
  const [method, setMethod] = useState<"cash" | "paymob">("cash");
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const { user, isDemoMode } = useAuth();
  useEffect(() => { let active = true; if (supabase && !isDemoMode) supabase.from("payment_methods").select("enabled").eq("code", "paymob").maybeSingle().then(({data})=>{if(active) setOnlineAvailable(Boolean(data?.enabled));}); return () => {active = false;}; }, [isDemoMode]);
  const { items, subtotal, clearCart } = useCart();
  const { currencySymbol, deliveryFee, minimumOrder } = useLayout();

  const [fulfillment, setFulfillment] = useState<"delivery" | "dine_in">("delivery");
  const [building, setBuilding] = useState("");
  const [apartment, setApartment] = useState("");
  const [floor, setFloor] = useState("");
  const [street, setStreet] = useState("");
  const [phone, setPhone] = useState("");
  const [destination, setDestination] = useState<DeliveryPoint | null>(null);
  const [instructions, setInstructions] = useState("");
  const [tableNumber, setTableNumber] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDelivery = fulfillment === "delivery";
  const estimatedTotal = subtotal + (isDelivery ? deliveryFee : 0);
  const belowMinimum = subtotal < minimumOrder;

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-6xl">🔐</p>
        <h1 className="mt-4 text-2xl font-bold text-primary">Login required</h1>
        <p className="mt-2 text-gray-500">
          You need an account to place an order — it keeps your order history safe.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/login" state={{ from: "/checkout" }}>
            <Button size="lg">Login</Button>
          </Link>
          <Link to="/register" state={{ from: "/checkout" }}>
            <Button size="lg" variant="outline">
              Register
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <p className="text-6xl">🛒</p>
        <h1 className="mt-4 text-2xl font-bold text-primary">Your cart is empty</h1>
        <p className="mt-2 text-gray-500">Add dishes from the menu before checking out.</p>
        <Link to="/menu" className="mt-6 inline-block">
          <Button size="lg">Browse Menu</Button>
        </Link>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setError(null);

    if (isDelivery && !destination) {
      setError("Please select your delivery location on the map.");
      return;
    }
    if (isDelivery && (!street.trim() || !building.trim() || phone.replace(/[^0-9٠-٩۰-۹]/g, "").length < 7)) {
      setError("Please enter your street, building and a valid phone number.");
      return;
    }
    if (!isDelivery) {
      const n = parseInt(tableNumber, 10);
      if (Number.isNaN(n) || n <= 0) {
        setError("Please enter a valid table number");
        return;
      }
    }

    if (inFlight.current) return;
    inFlight.current = true;
    setPlacing(true);
    try {
      const orderItems: CreateOrderItemInput[] = items.map((item) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
      }));

      if (supabase) {
        // Server-side order creation: totals are computed in Postgres from
        // menu_items.price; the client never sends prices.
        const args = {p_items: orderItems,p_method:method,p_table_number:isDelivery?null:parseInt(tableNumber,10),
          p_building:isDelivery?building.trim():null,p_apartment:isDelivery?apartment.trim():null,
          p_floor:isDelivery?floor.trim():null,p_street:isDelivery?street.trim():null,p_phone:isDelivery?phone.trim():null,
          p_instructions:isDelivery?instructions.trim():null,p_lat:isDelivery?destination!.lat:null,p_lng:isDelivery?destination!.lng:null};
        // Persist only a digest and request id, never address or phone. A retry
        // after a lost response gets the same order, not another order.
        const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(args)));
        const fingerprint=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
        const key=`mf-food-checkout-request:${user.id}`;
        let stored:{fingerprint:string;id:string}|null=null;
        try { stored=JSON.parse(sessionStorage.getItem(key)||'null'); } catch { /* no prior request */ }
        const requestId=stored?.fingerprint===fingerprint?stored.id:crypto.randomUUID();
        try { sessionStorage.setItem(key,JSON.stringify({fingerprint,id:requestId})); } catch { throw new Error('Browser storage is required to prevent duplicate orders.'); }
        const { data, error: rpcError } = await supabase.rpc("create_checkout_order", {...args,p_request_id:requestId});
        if (rpcError) throw new Error(rpcError.message);
        try { sessionStorage.removeItem(key); } catch { /* order already created */ }
        clearCart();
        navigate(method === "paymob" ? `/payment/${data as string}` : "/orders", { state: { placed: data as string } });
        return;
      }

      // ---- demo mode: simulate the same flow locally ----
      const demoOrder: DemoOrder = {
        id: `demo-${Date.now()}`,
        created_at: new Date().toISOString(),
        status: "pending",
        total_price: estimatedTotal,
        delivery_address: isDelivery ? [street.trim(), `Building: ${building.trim()}`, floor.trim() && `Floor: ${floor.trim()}`, apartment.trim() && `Apartment: ${apartment.trim()}`].filter(Boolean).join(", ") : null,
        notes: isDelivery ? instructions.trim() || null : null,
        delivery_details: isDelivery ? {building: building.trim(), apartment: apartment.trim(), floor: floor.trim(), street: street.trim(), phone: phone.trim(), destination: destination!} : null,
        table_number: isDelivery ? null : parseInt(tableNumber, 10),
        demo: true,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          price_at_order: item.price,
        })),
      };
      saveDemoOrder(demoOrder);
      clearCart();
      navigate("/orders", { state: { placed: demoOrder.id } });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not place the order");
    } finally {
      inFlight.current = false;
      setPlacing(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-extrabold text-primary">{tr(ar,'Checkout','إتمام الطلب')}</h1>

      <div className="grid gap-6 md:grid-cols-5">
        {/* ------------------------- Fulfillment ------------------------- */}
        <div className="space-y-4 md:col-span-3">
          <Card>
            <h2 className="mb-3 font-bold text-gray-900">{tr(ar,'How would you like your order?','كيف تريد استلام طلبك؟')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFulfillment("delivery")}
                className={[
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  isDelivery
                    ? "border-primary bg-primary-50"
                    : "border-gray-200 hover:border-primary-200",
                ].join(" ")}
              >
                <p className="text-2xl">🛵</p>
                <p className="mt-1 font-semibold text-gray-900">{tr(ar,'Delivery','توصيل')}</p>
                <p className="text-xs text-gray-500">
                  + {formatEGP(deliveryFee, currencySymbol)} delivery fee
                </p>
              </button>
              <button
                type="button"
                onClick={() => setFulfillment("dine_in")}
                className={[
                  "rounded-lg border-2 p-4 text-left transition-colors",
                  !isDelivery
                    ? "border-primary bg-primary-50"
                    : "border-gray-200 hover:border-primary-200",
                ].join(" ")}
              >
                <p className="text-2xl">🍽️</p>
                <p className="mt-1 font-semibold text-gray-900">{tr(ar,'Dine-in','داخل المطعم')}</p>
                <p className="text-xs text-gray-500">Served at your table</p>
              </button>
            </div>

            <div className="mt-4">
              {isDelivery ? (
                <div>
                  <Suspense fallback={<p>Loading map…</p>}><DeliveryMap value={destination} onChange={setDestination} /></Suspense>
                  <h3 className="mt-6 font-bold">{tr(ar,'2. Delivery address','٢. عنوان التوصيل')}</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label htmlFor="delivery-street" className="text-sm font-medium text-gray-700 sm:col-span-2">{tr(ar,'Street','الشارع')} <span aria-hidden="true">*</span><input id="delivery-street" aria-required="true" autoComplete="address-line1" maxLength={200} value={street} onChange={e => setStreet(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                    <label htmlFor="delivery-building" className="text-sm font-medium text-gray-700">{tr(ar,'Building name / number','اسم أو رقم المبنى')} <span aria-hidden="true">*</span><input id="delivery-building" aria-required="true" maxLength={160} value={building} onChange={e => setBuilding(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                    <label htmlFor="delivery-apartment" className="text-sm font-medium text-gray-700">{tr(ar,'Apartment number (optional)','رقم الشقة (اختياري)')}<input id="delivery-apartment" maxLength={80} value={apartment} onChange={e => setApartment(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                    <label htmlFor="delivery-floor" className="text-sm font-medium text-gray-700">{tr(ar,'Floor (optional)','الطابق (اختياري)')}<input id="delivery-floor" maxLength={80} value={floor} onChange={e => setFloor(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                    <label htmlFor="delivery-phone" className="text-sm font-medium text-gray-700">{tr(ar,'Phone number','رقم الهاتف')} <span aria-hidden="true">*</span><input id="delivery-phone" aria-required="true" type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                  </div>
                  <label htmlFor="delivery-instructions" className="mb-1 mt-3 block text-sm font-medium text-gray-700">{tr(ar,'Delivery instructions (optional)','تعليمات التوصيل (اختياري)')}</label>
                  <textarea id="delivery-instructions" rows={2} maxLength={1000} value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Gate code, directions, or delivery instructions" className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
                </div>
              ) : (
                <div>
                  <label htmlFor="table" className="mb-1 block text-sm font-medium text-gray-700">
                    {tr(ar,'Table number','رقم الطاولة')}
                  </label>
                  <input
                    id="table"
                    type="number"
                    min={1}
                    value={tableNumber}
                    onChange={(e) => setTableNumber(e.target.value)}
                    placeholder="e.g. 4"
                    className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-primary-50/60">
            <p className="text-sm text-gray-600">
              🔒 <strong>Secure ordering:</strong> prices, availability and the
              final total are re-validated on the server (PostgreSQL via
              Supabase). Nothing about money is taken from your browser.
            </p>
          </Card>
        </div>

        {/* --------------------------- Summary --------------------------- */}
        <Card className="h-fit md:col-span-2">
          <h2 className="mb-3 font-bold text-gray-900">{tr(ar,'Order summary','ملخص الطلب')}</h2>
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="flex items-center justify-between py-2 text-sm">
                <span className="min-w-0 flex-1 truncate pr-2">
                  <span className="font-medium">{item.name}</span>
                  <span className="text-gray-400"> × {item.quantity}</span>
                </span>
                <span className="font-semibold">
                  {formatEGP(item.price * item.quantity, currencySymbol)}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">{tr(ar,'Subtotal','المجموع الفرعي')}</span>
              <span className="font-semibold">{formatEGP(subtotal, currencySymbol)}</span>
            </div>
            {isDelivery && (
              <div className="flex justify-between">
                <span className="text-gray-600">{tr(ar,'Delivery fee','رسوم التوصيل')}</span>
                <span className="font-semibold">{formatEGP(deliveryFee, currencySymbol)}</span>
              </div>
            )}
            <div className="flex justify-between border-t border-gray-100 pt-2 text-base font-extrabold text-primary">
              <span>{tr(ar,'Estimated total','الإجمالي المتوقع')}</span>
              <span>{formatEGP(estimatedTotal, currencySymbol)}</span>
            </div>
          </div>

          <fieldset className="mt-4 space-y-2 rounded border p-3"><legend className="px-1 font-semibold">{tr(ar,'Payment method','طريقة الدفع')}</legend>
            <label className="flex items-center gap-2"><input type="radio" name="payment-method" checked={method==='cash'} onChange={()=>setMethod('cash')} />{isDelivery?tr(ar,'Cash on delivery','الدفع نقداً عند الاستلام'):tr(ar,'Cash at restaurant','الدفع نقداً في المطعم')}</label>
            <label className="flex items-center gap-2"><input type="radio" name="payment-method" checked={method==='paymob'} disabled={!onlineAvailable} onChange={()=>setMethod('paymob')} />{tr(ar,'Online payment with Paymob','الدفع الإلكتروني عبر باي موب')}</label>
            {!onlineAvailable&&<p className="text-xs text-gray-500">{tr(ar,'Online payment is not available yet.','الدفع الإلكتروني غير متاح حالياً.')}</p>}
          </fieldset>
          {belowMinimum && (
            <div className="mt-3">
              <Badge variant="warning">
                Minimum order is {formatEGP(minimumOrder, currencySymbol)} — add{" "}
                {formatEGP(minimumOrder - subtotal, currencySymbol)} more
              </Badge>
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button
            size="lg"
            fullWidth
            className="mt-4"
            disabled={placing || belowMinimum}
            onClick={handlePlaceOrder}
          >
            {placing ? tr(ar,'Placing order…','جارٍ إنشاء الطلب…') : tr(ar,'Place Order','تأكيد الطلب')}
          </Button>
          {isDemoMode && (
            <p className="mt-2 text-center text-xs text-gray-400">
              Demo mode: this order and delivery details stay in this browser and are not sent to the restaurant. Anyone using this browser can see them.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
