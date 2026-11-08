import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth, useLayout } from '../../app/providers';
import { formatEGP } from '../../lib/format';
import { Button, Card } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { statusText, tr, useArabic } from './Shell';
import { useRealtimeRefresh } from './live';

type Delivery={order_id:string;status:string;order_status:string;address:string;notes:string|null;assigned_at:string;latitude:number|null;longitude:number|null;total_price:number;items:{name:string;quantity:number}[]};
type Watch={id:number;orderId:string;lastAt:number;lat:number|null;lng:number|null;sending:boolean};
function distance(a:number,b:number,c:number,d:number){const r=Math.PI/180;const x=(d-b)*r*Math.cos((a+c)*r/2);const y=(c-a)*r;return Math.sqrt(x*x+y*y)*6371000;}
export default function Driver(){ const {user}=useAuth();return <DriverSession key={user?.id ?? "signed-out"}/>; }
function DriverSession(){
 const {user,isLoading,isDemoMode}=useAuth();const {currencySymbol}=useLayout();const ar=useArabic();const [deliveries,setDeliveries]=useState<Delivery[]>([]);const [phones,setPhones]=useState<Record<string,string>>({});const [authorized,setAuthorized]=useState<boolean|null>(null);const [error,setError]=useState('');const [busy,setBusy]=useState('');const [gps,setGps]=useState('');const [sharing,setSharing]=useState('');const watch=useRef<Watch|null>(null);const generation=useRef(0);
 const stop=useCallback(()=>{if(watch.current){navigator.geolocation?.clearWatch(watch.current.id);watch.current=null;}setSharing('');setGps(tr(ar,'Location sharing stopped.','تم إيقاف مشاركة الموقع.'));},[ar]);
 const load=useCallback(async()=>{if(!supabase||!user||isDemoMode)return;const request=++generation.current;const [a,d]=await Promise.all([supabase.from('delivery_drivers').select('id,is_active').eq('profile_id',user.id).maybeSingle(),supabase.rpc('driver_deliveries')]);if(request!==generation.current)return;if(a.error||d.error){setError(a.error?.message||d.error?.message||'Unable to load');return;}const rows=(d.data||[]) as Delivery[];let contacts:Record<string,string>={};if(rows.length){const details=await supabase.from('delivery_details').select('order_id,phone').in('order_id',rows.map(row=>row.order_id));if(request!==generation.current)return;if(details.error){setError(details.error.message);return;}contacts=Object.fromEntries((details.data||[]).map(row=>[row.order_id,row.phone]));}setPhones(contacts);setAuthorized(Boolean(a.data?.is_active));setDeliveries(rows);setError('');},[user?.id,isDemoMode]);
 const connection=useRealtimeRefresh(['delivery_jobs','orders'],()=>void load(),Boolean(user&&supabase&&!isDemoMode));
 useEffect(()=>{if(watch.current&&!deliveries.some(d=>d.order_id===watch.current?.orderId&&d.status==='on_the_way'))stop();},[deliveries,stop]);
 useLayoutEffect(()=>()=>{generation.current++;if(watch.current)navigator.geolocation?.clearWatch(watch.current.id);watch.current=null;},[]);
 const advance=async(d:Delivery,next:string)=>{if(!supabase)return;setBusy(d.order_id);setError('');const {error:e}=await supabase.rpc('advance_delivery',{p_order_id:d.order_id,p_expected:d.status,p_next:next});if(e)setError(e.message);if(next==='delivered'&&!e)stop();await load();setBusy('');};
 const start=(d:Delivery)=>{
  if(d.status!=='on_the_way')return;
  if(!window.isSecureContext||!navigator.geolocation){setGps(tr(ar,'GPS requires HTTPS and device support.','يتطلب تحديد الموقع اتصال HTTPS وجهازاً يدعمه.'));return;}
  stop();setGps(tr(ar,'Requesting location permission…','طلب إذن الموقع…'));
  const w:Watch={id:0,orderId:d.order_id,lastAt:0,lat:null,lng:null,sending:false};watch.current=w;
  w.id=navigator.geolocation.watchPosition(async position=>{
    if(watch.current!==w||!supabase)return;const {latitude:lat,longitude:lng}=position.coords;const now=Date.now();
    if(w.sending||(now-w.lastAt<15000)||(w.lat!==null&&w.lng!==null&&distance(w.lat,w.lng,lat,lng)<20&&now-w.lastAt<60000))return;
    w.sending=true;
    try {
      const {error:e}=await supabase.rpc('publish_driver_location',{p_order_id:w.orderId,p_lat:lat,p_lng:lng});
      if(watch.current!==w)return;
      if(e){setGps(`${tr(ar,'Location not sent','لم يتم إرسال الموقع')}: ${e.message}`);return;}
      w.lastAt=now;w.lat=lat;w.lng=lng;setGps(`${tr(ar,'Last shared','آخر مشاركة')}: ${new Date().toLocaleTimeString()}`);
    } catch { if(watch.current===w)setGps(tr(ar,'Location could not be sent. Retrying when GPS updates.','تعذر إرسال الموقع. ستتم إعادة المحاولة.')); }
    finally { w.sending=false; }
  },e=>{if(watch.current===w){if(e.code===1){navigator.geolocation.clearWatch(w.id);watch.current=null;setSharing('');}setGps(`${tr(ar,'GPS unavailable or permission denied','الموقع غير متاح أو تم رفض الإذن')}: ${e.message}`);}},{enableHighAccuracy:true,maximumAge:10000,timeout:20000});
  setSharing(d.order_id);
 };
 if(isLoading)return <p className="p-8">{tr(ar,'Loading…','جار التحميل…')}</p>;
 if(!user)return <p className="p-8">{tr(ar,'Login required.','يجب تسجيل الدخول.')} <Link className="text-primary underline" to="/login" state={{from:'/driver'}}>{tr(ar,'Sign in','دخول')}</Link></p>;
 if(isDemoMode||!supabase)return <p className="p-8">{tr(ar,'A real Supabase account is required.','يلزم حساب Supabase حقيقي.')}</p>;
 if(authorized===false)return <p className="p-8">{tr(ar,'This account is not an active driver.','هذا الحساب ليس سائقاً نشطاً.')}</p>;
 return <div className="mx-auto max-w-3xl px-4 py-8"><h1 className="text-3xl font-bold">{tr(ar,'Driver deliveries','طلبات السائق')}</h1><p className="mb-4 text-sm text-gray-500">{statusText(ar,connection)} · {tr(ar,'Keep this page open while sharing GPS.','أبقِ الصفحة مفتوحة أثناء مشاركة الموقع.')}</p>{error&&<p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}{gps&&<p role="status" className="mb-4 rounded bg-blue-50 p-3 text-blue-800">{gps}</p>}{authorized===null&&<p>{tr(ar,'Loading…','جار التحميل…')}</p>}{authorized&&deliveries.length===0&&<p>{tr(ar,'No active deliveries.','لا توجد طلبات نشطة.')}</p>}
 <div className="space-y-4">{deliveries.map(d=>{const next=d.status==='assigned'?'picked_up':d.status==='picked_up'?'on_the_way':d.status==='on_the_way'?'delivered':null;const target=d.latitude!==null&&d.longitude!==null?`${d.latitude},${d.longitude}`:d.address;return <Card key={d.order_id} className="p-5"><h2 className="text-xl font-bold">#{d.order_id.slice(0,8)}</h2><p className="mt-1 font-semibold">{statusText(ar,d.status)} · {tr(ar,'Kitchen','المطبخ')}: {statusText(ar,d.order_status)}</p><p className="mt-3">{d.address}</p>{phones[d.order_id]&&<p className="mt-2">{tr(ar,'Customer phone','هاتف العميل')}: <a className="text-primary underline" href={`tel:${phones[d.order_id]}`}>{phones[d.order_id]}</a></p>}<ul className="mt-2 text-sm">{(d.items||[]).map((item,i)=><li key={i}>{item.quantity} × {item.name}</li>)}</ul><p className="mt-2 font-semibold">{tr(ar,'Order total','إجمالي الطلب')}: {formatEGP(d.total_price,currencySymbol)}</p>{d.notes&&<p className="mt-2 rounded bg-amber-50 p-2">{tr(ar,'Instructions','تعليمات')}: {d.notes}</p>}<p className="mt-2 text-xs text-gray-500">{tr(ar,'Opening navigation sends the destination to the selected map service.','فتح الملاحة يرسل الوجهة إلى خدمة الخرائط.')}</p><a className="mt-3 inline-flex min-h-12 items-center rounded border border-primary px-4 font-semibold text-primary" href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`} target="_blank" rel="noreferrer">{tr(ar,'Open navigation','فتح الملاحة')}</a><div className="mt-3 flex flex-wrap gap-2">{next&&<Button size="lg" disabled={busy===d.order_id||d.order_status!=='ready'} onClick={()=>void advance(d,next)}>{tr(ar,`Mark ${next.replace(/_/g,' ')}`,next==='picked_up'?'تم الاستلام':next==='on_the_way'?'بدأ التوصيل':'تم التسليم')}</Button>}{d.status==='on_the_way'&&(sharing===d.order_id?<Button variant="outline" size="lg" onClick={stop}>{tr(ar,'Stop GPS','إيقاف الموقع')}</Button>:<Button variant="outline" size="lg" onClick={()=>start(d)}>{tr(ar,'Start sharing GPS','بدء مشاركة الموقع')}</Button>)}</div>{d.order_status!=='ready'&&<p className="mt-2 text-sm text-gray-500">{tr(ar,'Pickup is available when the kitchen marks the order ready.','يمكن الاستلام عندما يصبح الطلب جاهزاً.')}</p>}</Card>;})}</div></div>;
}
