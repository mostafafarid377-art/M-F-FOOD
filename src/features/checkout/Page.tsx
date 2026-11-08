import React, { Suspense, useEffect, useRef, useState } from "react";
import { tr, useArabic } from "../phase5/Shell";
import type { DeliveryPoint } from "./DeliveryMap";
const DeliveryMap = React.lazy(() => import("./DeliveryMap"));
import { Link, useNavigate } from "react-router-dom";
import { ButtonLink, Badge, Button, Card } from "../../components/ui";
import { PAYMOB_PAUSED } from "../payments/policy";
import { formatEGP } from "../../lib/format";
import { supabase } from "../../lib/supabase";
import { useAuth, useCart, useLayout } from "../../app/providers";
import type { CreateOrderItemInput } from "../../types/supabase";
import { deleteAddress, loadSavedAddress, saveAddress, type SavedAddress } from "./savedAddress";

const DEMO_ORDERS_KEY = "mf-food-demo-orders";

export interface DemoOrder {
  customer_id?: string;
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
  const { user } = useAuth();
  // Reset all delivery fields when the signed-in account changes.
  return <CheckoutContent key={user?.id ?? "guest"} />;
}

function CheckoutContent() {
  const navigate = useNavigate();
  const ar = useArabic();
  const inFlight = useRef(false);
  const [method, setMethod] = useState<"cash" | "paymob">("cash");
  const [onlineAvailable, setOnlineAvailable] = useState(false);
  const { user, isDemoMode } = useAuth();
  useEffect(() => { let active = true; if (supabase && !isDemoMode && !PAYMOB_PAUSED) supabase.from("payment_methods").select("enabled").eq("code", "paymob").maybeSingle().then(({data})=>{if(active) setOnlineAvailable(Boolean(data?.enabled));}); return () => {active = false;}; }, [isDemoMode]);
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
  const [instructionChoices, setInstructionChoices] = useState<string[]>([]);
  const [savedAddress, setSavedAddress] = useState<SavedAddress | null>(null);
  const [addressEditing, setAddressEditing] = useState(true);
  const [addressLoading, setAddressLoading] = useState(true);
  const [addressBusy, setAddressBusy] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [tableNumber, setTableNumber] = useState("");
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const applyAddress = (address: SavedAddress) => {
    setStreet(address.street); setBuilding(address.building); setApartment(address.apartment);
    setFloor(address.floor); setPhone(address.phone);
    setDestination({ lat: address.latitude, lng: address.longitude });
  };
  useEffect(() => {
    let active = true;
    let settled = false;
    if (!user) { setAddressLoading(false); return () => { active = false; }; }
    setAddressLoading(true);
    const unavailable = () => {
      setAddressError("Saved address is unavailable. You can still enter an address and place your order.");
      setAddressLoading(false);
    };
    // A failed or stalled optional address lookup must not block cash checkout.
    const timeout = window.setTimeout(() => {
      if (active && !settled) { settled = true; unavailable(); }
    }, 8000);
    loadSavedAddress(user.id, isDemoMode).then(address => {
      if (!active || settled) return;
      settled = true; window.clearTimeout(timeout);
      if (address) { setSavedAddress(address); applyAddress(address); setAddressEditing(false); }
      setAddressLoading(false);
    }).catch(() => {
      if (!active || settled) return;
      settled = true; window.clearTimeout(timeout); unavailable();
    });
    return () => { active = false; window.clearTimeout(timeout); };
  }, [user?.id, isDemoMode]);

  const addressValid = Boolean(destination && Number.isFinite(destination.lat) && Number.isFinite(destination.lng) && Math.abs(destination.lat) <= 90 && Math.abs(destination.lng) <= 180 && street.trim() && building.trim() && phone.replace(/[^0-9٠-٩۰-۹]/g, "").length >= 7);
  const rememberAddress = async () => {
    if (!user) return;
    if (!addressValid || !destination) { setAddressError("Choose a location and enter your street, building and valid phone number before saving."); return; }
    const address: SavedAddress = { street: street.trim(), building: building.trim(), apartment: apartment.trim(), floor: floor.trim(), phone: phone.trim(), latitude: destination.lat, longitude: destination.lng };
    setAddressBusy(true); setAddressError(null);
    try { await saveAddress(user.id, isDemoMode, address); setSavedAddress(address); applyAddress(address); setAddressEditing(false); }
    catch { setAddressError("Could not save your address. You can still place your order."); }
    finally { setAddressBusy(false); }
  };
  const removeSavedAddress = async () => {
    if (!user) return;
    setAddressBusy(true); setAddressError(null);
    try { await deleteAddress(user.id, isDemoMode); setSavedAddress(null); setAddressEditing(true); }
    catch { setAddressError("Could not remove your saved address. Please try again."); }
    finally { setAddressBusy(false); }
  };
  const deliveryInstructions = [...instructionChoices, instructions.trim()].filter(Boolean).join("; ");
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
          <ButtonLink to="/login" state={{ from: "/checkout" }} size="lg">Login</ButtonLink>
          <ButtonLink to="/register" state={{ from: "/checkout" }} size="lg" variant="outline">Register
            </ButtonLink>
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
        <ButtonLink to="/menu" size="lg" className={["mt-6 inline-block"].filter(Boolean).join(' ')}>Browse Menu</ButtonLink>
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
    if (isDelivery && deliveryInstructions.length > 1000) {
      setError("Delivery instructions must be 1000 characters or fewer including selected options.");
      return;
    }
    if (!isDelivery) {
      const n = parseInt(tableNumber, 10);
      if (Number.isNaN(n) || n <= 0) {
        setError("Please enter a valid table number");
        return;
      }
    }

    if (method === "paymob" && PAYMOB_PAUSED) { setError("Online payments are currently paused. Please choose cash."); return; }
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
          p_instructions:isDelivery?deliveryInstructions:null,p_lat:isDelivery?destination!.lat:null,p_lng:isDelivery?destination!.lng:null};
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
        customer_id: user?.id,
        id: `demo-${Date.now()}`,
        created_at: new Date().toISOString(),
        status: "pending",
        total_price: estimatedTotal,
        delivery_address: isDelivery ? [street.trim(), `Building: ${building.trim()}`, floor.trim() && `Floor: ${floor.trim()}`, apartment.trim() && `Apartment: ${apartment.trim()}`].filter(Boolean).join(", ") : null,
        notes: isDelivery ? deliveryInstructions || null : null,
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
    <div className="mx-auto max-w-5xl px-4 pb-40 pt-6 md:pb-10 md:pt-8">
      <div className="mb-6 flex items-center gap-3">
        <Link to="/cart" aria-label="Back to cart" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-xl text-gray-700 hover:border-primary">‹</Link>
        <div><h1 className="text-2xl font-extrabold text-gray-900">{tr(ar,'Checkout','إتمام الطلب')}</h1><p className="text-sm text-gray-500">{tr(ar,'Review your order','راجع طلبك')}</p></div>
      </div>
      <div className="grid items-start gap-5 md:grid-cols-5">
        <div className="space-y-4 md:col-span-3">
          <Card>
            <h2 className="mb-3 text-lg font-bold text-gray-900">{tr(ar,'Delivery or dine-in','توصيل أو داخل المطعم')}</h2>
            <div className="grid grid-cols-2 gap-3">
              <button type="button" aria-pressed={isDelivery} onClick={() => setFulfillment("delivery")} className={`rounded-xl border-2 p-3 text-left transition-colors ${isDelivery ? "border-primary bg-primary-50" : "border-gray-200 hover:border-primary-200"}`}>
                <span aria-hidden="true" className="mr-2 text-xl">🛵</span><span className="font-semibold">{tr(ar,'Delivery','توصيل')}</span>
                <span className="mt-1 block text-xs text-gray-500">{formatEGP(deliveryFee, currencySymbol)} {tr(ar,'delivery fee','رسوم التوصيل')}</span>
              </button>
              <button type="button" aria-pressed={!isDelivery} onClick={() => setFulfillment("dine_in")} className={`rounded-xl border-2 p-3 text-left transition-colors ${!isDelivery ? "border-primary bg-primary-50" : "border-gray-200 hover:border-primary-200"}`}>
                <span aria-hidden="true" className="mr-2 text-xl">🍽️</span><span className="font-semibold">{tr(ar,'Dine-in','داخل المطعم')}</span>
                <span className="mt-1 block text-xs text-gray-500">{tr(ar,'Served at your table','يقدم على طاولتك')}</span>
              </button>
            </div>
            {!isDelivery && <div className="mt-4"><label htmlFor="table" className="mb-1 block text-sm font-medium text-gray-700">{tr(ar,'Table number','رقم الطاولة')}</label><input id="table" type="number" min={1} value={tableNumber} onChange={e => setTableNumber(e.target.value)} placeholder="e.g. 4" className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm" /></div>}
          </Card>

          {isDelivery && <>
            <Card>
              <div className="mb-3 flex items-center justify-between gap-3"><h2 className="text-lg font-bold text-gray-900">{tr(ar,'Delivery address','عنوان التوصيل')}</h2>{savedAddress && !addressEditing && <button type="button" onClick={() => setAddressEditing(true)} className="font-semibold text-primary underline">{tr(ar,'Change','تغيير')}</button>}</div>
              {addressLoading ? <p className="text-sm text-gray-500">{tr(ar,'Loading saved address…','جارٍ تحميل العنوان المحفوظ…')}</p> : addressEditing ? <>
                <Suspense fallback={<p>Loading map…</p>}><DeliveryMap value={destination} onChange={setDestination} /></Suspense>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label htmlFor="delivery-street" className="text-sm font-medium text-gray-700 sm:col-span-2">{tr(ar,'Street','الشارع')} <span aria-hidden="true">*</span><input id="delivery-street" aria-required="true" autoComplete="address-line1" maxLength={200} value={street} onChange={e => setStreet(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                  <label htmlFor="delivery-building" className="text-sm font-medium text-gray-700">{tr(ar,'Building name / number','اسم أو رقم المبنى')} <span aria-hidden="true">*</span><input id="delivery-building" aria-required="true" maxLength={160} value={building} onChange={e => setBuilding(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                  <label htmlFor="delivery-apartment" className="text-sm font-medium text-gray-700">{tr(ar,'Apartment number (optional)','رقم الشقة (اختياري)')}<input id="delivery-apartment" maxLength={80} value={apartment} onChange={e => setApartment(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                  <label htmlFor="delivery-floor" className="text-sm font-medium text-gray-700">{tr(ar,'Floor (optional)','الطابق (اختياري)')}<input id="delivery-floor" maxLength={80} value={floor} onChange={e => setFloor(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                  <label htmlFor="delivery-phone" className="text-sm font-medium text-gray-700">{tr(ar,'Phone number','رقم الهاتف')} <span aria-hidden="true">*</span><input id="delivery-phone" aria-required="true" type="tel" autoComplete="tel" maxLength={30} value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label>
                </div>
                <div className="mt-4 flex flex-wrap gap-2"><Button variant="outline" onClick={rememberAddress} disabled={addressBusy}>{addressBusy ? tr(ar,'Saving…','جارٍ الحفظ…') : tr(ar,'Save address for next time','حفظ العنوان للمرة القادمة')}</Button>{savedAddress && <Button variant="ghost" disabled={addressBusy} onClick={() => { applyAddress(savedAddress); setAddressEditing(false); setAddressError(null); }}>{tr(ar,'Cancel changes','إلغاء التغييرات')}</Button>}</div>
                {isDemoMode && <p className="mt-2 text-xs text-gray-500">Demo: a saved address stays in this browser and is visible to anyone using it.</p>}
              </> : savedAddress && <>
                <Suspense fallback={<p>Loading map…</p>}><DeliveryMap value={{lat:savedAddress.latitude,lng:savedAddress.longitude}} onChange={() => {}} readOnly /></Suspense>
                <p className="mt-1 text-xs text-gray-500">{tr(ar,'OpenStreetMap receives the viewed map area.','تتلقى OpenStreetMap منطقة الخريطة المعروضة.')}</p>
                <div className="mt-4 flex items-start gap-3"><span aria-hidden="true" className="text-xl">⌖</span><div className="min-w-0 break-words"><p className="font-bold text-gray-900">{savedAddress.street}, {tr(ar,'Building','مبنى')} {savedAddress.building}</p><p className="text-sm text-gray-600">{[savedAddress.floor && `${tr(ar,'Floor','الطابق')} ${savedAddress.floor}`, savedAddress.apartment && `${tr(ar,'Apartment','الشقة')} ${savedAddress.apartment}`].filter(Boolean).join(' · ')}</p><p className="text-sm text-gray-600">{tr(ar,'Phone','الهاتف')}: {savedAddress.phone}</p></div></div>
                <button type="button" disabled={addressBusy} onClick={removeSavedAddress} className="mt-3 text-sm text-gray-600 underline disabled:opacity-50">{tr(ar,'Remove saved address','حذف العنوان المحفوظ')}</button>
              </>}
              {addressError && <p role="status" className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">{addressError}</p>}
            </Card>

            <Card>
              <h2 className="text-lg font-bold text-gray-900">{tr(ar,'Delivery instructions','تعليمات التوصيل')}</h2>
              <p className="mt-1 text-sm text-gray-500">{tr(ar,'Choose any that apply or add a note for your rider.','اختر ما يناسبك أو أضف ملاحظة للمندوب.')}</p>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {([['Ring doorbell','قرع جرس الباب','🔔'],['Message on arrival','أرسل رسالة عند الوصول','💬'],['Leave at my door','اترك الطلب عند الباب','🚪']] as const).map(([en,arabic,icon]) => <button key={en} type="button" aria-pressed={instructionChoices.includes(en)} onClick={() => setInstructionChoices(current => current.includes(en) ? current.filter(x => x !== en) : [...current,en])} className={`min-h-20 rounded-xl border p-3 text-left text-sm font-semibold ${instructionChoices.includes(en) ? 'border-primary bg-primary-50 text-primary' : 'border-gray-200 hover:border-primary-200'}`}><span aria-hidden="true" className="mb-1 block text-xl">{icon}</span>{tr(ar,en,arabic)}</button>)}
              </div>
              <label htmlFor="delivery-instructions" className="mb-1 mt-4 block text-sm font-medium text-gray-700">{tr(ar,'Delivery instructions (optional)','تعليمات التوصيل (اختياري)')}</label>
              <textarea id="delivery-instructions" rows={2} maxLength={1000} value={instructions} onChange={e => setInstructions(e.target.value)} placeholder={tr(ar,'Gate code, directions, or other instructions','رمز البوابة أو الاتجاهات أو تعليمات أخرى')} className="w-full rounded-md border border-primary-200 px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary" />
              <p className="text-xs text-gray-500">{tr(ar,'Instructions are shared with staff handling your order.','تتم مشاركة التعليمات مع العاملين على طلبك.')}</p>
            </Card>
          </>}

          <Card>
            <fieldset><legend className="mb-3 text-lg font-bold text-gray-900">{tr(ar,'Pay with','الدفع بواسطة')}</legend>
              <label className="flex cursor-pointer items-center justify-between gap-3 border-b border-gray-100 py-3"><span><span aria-hidden="true" className="mr-3">💵</span>{isDelivery ? tr(ar,'Cash on delivery','الدفع نقداً عند الاستلام') : tr(ar,'Cash at restaurant','الدفع نقداً في المطعم')}</span><input type="radio" name="payment-method" checked={method==='cash'} onChange={()=>setMethod('cash')} className="h-5 w-5 accent-primary" /></label>
              <label className={`flex items-center justify-between gap-3 py-3 ${onlineAvailable ? 'cursor-pointer' : 'text-gray-400'}`}><span><span aria-hidden="true" className="mr-3">💳</span>{tr(ar,'Online payment with Paymob','الدفع الإلكتروني عبر باي موب')}</span><input type="radio" name="payment-method" checked={method==='paymob'} disabled={!onlineAvailable} onChange={()=>{if (onlineAvailable && !PAYMOB_PAUSED) setMethod('paymob');}} className="h-5 w-5 accent-primary" /></label>
              {!onlineAvailable && <p className="text-xs text-gray-500">{tr(ar,'Online payment is not available yet.','الدفع الإلكتروني غير متاح حالياً.')}</p>}
              {onlineAvailable && <p className="text-xs text-gray-500">{tr(ar,'You will continue to Paymob’s secure checkout.','ستنتقل إلى صفحة الدفع الآمنة من باي موب.')}</p>}
            </fieldset>
          </Card>
        </div>

        <div className="space-y-4 md:col-span-2 md:sticky md:top-24">
          <Card>
            <h2 className="mb-3 text-lg font-bold text-gray-900">{tr(ar,'Order summary','ملخص الطلب')}</h2>
            <ul className="divide-y divide-gray-100">{items.map(item => <li key={item.id} className="flex items-start justify-between gap-3 py-2 text-sm"><span className="min-w-0 break-words [overflow-wrap:anywhere]"><span className="font-medium">{item.name}</span><span className="text-gray-500"> × {item.quantity}</span></span><span className="shrink-0 font-semibold">{formatEGP(item.price * item.quantity, currencySymbol)}</span></li>)}</ul>
          </Card>
          <Card>
            <h2 className="mb-3 text-lg font-bold text-gray-900">{tr(ar,'Payment summary','ملخص الدفع')}</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3"><span className="text-gray-600">{tr(ar,'Subtotal','المجموع الفرعي')}</span><span className="font-semibold">{formatEGP(subtotal, currencySymbol)}</span></div>
              {isDelivery && <div className="flex justify-between gap-3"><span className="text-gray-600">{tr(ar,'Delivery fee','رسوم التوصيل')}</span><span className="font-semibold">{formatEGP(deliveryFee, currencySymbol)}</span></div>}
              <div className="flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-3 text-base font-extrabold"><span>{tr(ar,'Estimated total','الإجمالي المتوقع')}</span><span className="break-all text-primary">{formatEGP(estimatedTotal, currencySymbol)}</span></div>
            </div>
            <p className="mt-3 text-xs text-gray-500">{tr(ar,'Final prices and availability are confirmed by the server when you order.','يتم تأكيد الأسعار والتوافر النهائيين عند الطلب.')}</p>
          </Card>
          {belowMinimum && <Badge variant="warning">{tr(ar,'Minimum order is','الحد الأدنى للطلب')} {formatEGP(minimumOrder, currencySymbol)} — {tr(ar,'add','أضف')} {formatEGP(minimumOrder - subtotal, currencySymbol)} {tr(ar,'more','إضافية')}</Badge>}
          {isDemoMode && <p className="text-xs text-gray-500">Demo mode: this order and delivery details stay in this browser and are not sent to the restaurant. Anyone using this browser can see them.</p>}
          <div className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white p-3 shadow-lg md:static md:border-0 md:bg-transparent md:p-0 md:shadow-none">
            {error && <p role="alert" className="mb-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <Button size="lg" fullWidth disabled={placing || belowMinimum || (isDelivery && addressLoading)} onClick={handlePlaceOrder} className="justify-between rounded-xl font-bold">
              <span>{placing ? tr(ar,'Placing order…','جارٍ إنشاء الطلب…') : tr(ar,'Place Order','تأكيد الطلب')}</span><span>{tr(ar,'Est.','تقدير')} {formatEGP(estimatedTotal, currencySymbol)}</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
