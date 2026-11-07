import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useAuth } from '../../app/providers';
import { Button, Card } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { statusText, tr, useArabic } from './Shell';
import { useRealtimeRefresh } from './live';

type Point={lat:number;lng:number};
type TrackingData={order_id:string;order_status:string;delivery_status:string|null;driver_name:string|null;driver_phone:string|null;restaurant:Point|null;destination:Point|null;driver_location:(Point&{updated_at:string})|null};
function FitTrackingMap({restaurant,destination,driver}:{restaurant:Point|null;destination:Point|null;driver:Point|null}) {
 const map=useMap();
 useEffect(()=>{
   const points=[restaurant,destination,driver].filter((p):p is Point=>Boolean(p)).map(p=>[p.lat,p.lng] as [number,number]);
   if(points.length===1) map.setView(points[0],15);
   else if(points.length>1) map.fitBounds(points,{padding:[30,30],maxZoom:15});
 },[map,restaurant?.lat,restaurant?.lng,destination?.lat,destination?.lng,driver?.lat,driver?.lng]);
 return null;
}
export default function Tracking(){
 const ar=useArabic();const {orderId=''}=useParams();const {user,isLoading,isDemoMode}=useAuth();const [data,setData]=useState<TrackingData|null>(null);const [error,setError]=useState('');const [routing,setRouting]=useState(false);const [route,setRoute]=useState<[number,number][]>([]);const [eta,setEta]=useState<number|null>(null);const [routeError,setRouteError]=useState('');const [now,setNow]=useState(Date.now());const [loading,setLoading]=useState(true);const generation=useRef(0);
 useEffect(()=>{setData(null);setLoading(true);return()=>{generation.current++;};},[orderId,user?.id]);
 const final=Boolean(data&&(['completed','cancelled'].includes(data.order_status)||['delivered','cancelled'].includes(data.delivery_status||'')));
 const load=useCallback(async()=>{if(!supabase||!user||!orderId)return;const request=++generation.current;const {data:result,error:e}=await supabase.rpc('customer_tracking',{p_order_id:orderId});if(request!==generation.current)return;if(e)setError(e.message);else{setData(result as TrackingData);setError('');}setLoading(false);},[user?.id,orderId]);
 const connection=useRealtimeRefresh(['orders','delivery_jobs','delivery_locations','delivery_destinations'],()=>void load(),Boolean(user&&supabase&&!isDemoMode&&!final));
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
 const stale=!data?.driver_location||now-new Date(data.driver_location.updated_at).getTime()>120000;
 const dest=data?.destination;const driver=data?.driver_location;const base=import.meta.env.VITE_ROUTING_URL as string|undefined;
 useEffect(()=>{
   setRoute([]);setEta(null);setRouteError('');if(!routing||final||stale||!driver||!dest||!base)return;
   const controller=new AbortController();
   async function getRoute(){try{const url=new URL(base!);if(url.protocol!=='https:')throw new Error('Routing service must use HTTPS');url.pathname=`${url.pathname.replace(/\/$/,'')}/route/v1/driving/${driver!.lng},${driver!.lat};${dest!.lng},${dest!.lat}`;url.search='overview=full&geometries=geojson';const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error(`Routing service returned ${response.status}`);const result=await response.json();const r=result.code==='Ok'&&result.routes?.[0];if(!r||!Number.isFinite(r.duration)||!Array.isArray(r.geometry?.coordinates))throw new Error('No route available');const points=r.geometry.coordinates.filter((p:unknown)=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1])).map((p:number[])=>[p[1],p[0]] as [number,number]);if(points.length<2)throw new Error('No route geometry available');setRoute(points);setEta(Math.ceil(r.duration/60));}catch(e){if(!controller.signal.aborted)setRouteError((e as Error).message);}}
   void getRoute();return()=>controller.abort();
 },[routing,final,stale,driver?.lat,driver?.lng,dest?.lat,dest?.lng,base]);
 if(isLoading)return <p className="p-8">{tr(ar,'Loading…','جار التحميل…')}</p>;
 if(!user)return <p className="p-8">{tr(ar,'Login required.','يجب تسجيل الدخول.')} <Link to="/login" state={{from:`/track/${orderId}`}} className="text-primary underline">{tr(ar,'Sign in','دخول')}</Link></p>;
 if(isDemoMode||!supabase)return <p className="p-8">{tr(ar,'Tracking requires a real order.','يتطلب التتبع طلباً حقيقياً.')}</p>;
 const centre=data?.restaurant||dest||driver;
 return <div className="mx-auto max-w-4xl px-4 py-8"><Link to="/orders" className="text-primary underline">← {tr(ar,'My orders','طلباتي')}</Link><h1 className="mt-4 text-3xl font-bold">{tr(ar,'Track delivery','تتبع التوصيل')} #{orderId.slice(0,8)}</h1><p className="text-sm text-gray-500">{final?tr(ar,'Tracking stopped','انتهى التتبع'):statusText(ar,connection)}</p>{error&&<p role="alert" className="mt-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}{loading&&<p className="mt-4">{tr(ar,'Loading…','جار التحميل…')}</p>}
 {data&&<><Card className="my-4 p-4"><p className="font-bold">{tr(ar,'Delivery status','حالة التوصيل')}: {statusText(ar,data.order_status==='cancelled'||data.order_status==='completed'?data.order_status:!data.delivery_status||data.delivery_status==='unassigned'?data.order_status:data.delivery_status)}</p>{data.driver_name&&<p>{tr(ar,'Driver','السائق')}: {data.driver_name} {data.driver_phone&&<a className="text-primary underline" href={`tel:${data.driver_phone}`}>{data.driver_phone}</a>}</p>}{!final&&<p className="mt-1 text-sm text-gray-600">{driver?`${tr(ar,'Last update','آخر تحديث')}: ${new Date(driver.updated_at).toLocaleString()}${stale?` · ${tr(ar,'Location is stale','الموقع قديم')}`:''}`:tr(ar,'Live driver location is not available yet.','موقع السائق المباشر غير متاح بعد.')}</p>}</Card>
 {centre?<><MapContainer center={[centre.lat,centre.lng]} zoom={13} scrollWheelZoom className="z-0 h-[420px] w-full rounded-xl border"><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"/><FitTrackingMap restaurant={data.restaurant} destination={dest??null} driver={!final?driver??null:null}/>{data.restaurant&&<CircleMarker center={[data.restaurant.lat,data.restaurant.lng]} radius={10} pathOptions={{color:'#c2410c'}}><Popup>{tr(ar,'Restaurant','المطعم')}</Popup></CircleMarker>}{dest&&<CircleMarker center={[dest.lat,dest.lng]} radius={10} pathOptions={{color:'#2563eb'}}><Popup>{tr(ar,'Destination','الوجهة')}</Popup></CircleMarker>}{driver&&!final&&<CircleMarker center={[driver.lat,driver.lng]} radius={10} pathOptions={{color:stale?'#6b7280':'#16a34a'}}><Popup>{tr(ar,'Driver','السائق')}</Popup></CircleMarker>}{route.length>1&&!stale&&!final&&<Polyline positions={route} pathOptions={{color:'#ea580c'}}/>}</MapContainer><p className="mt-2 text-xs text-gray-500">{tr(ar,'Map tiles are provided by OpenStreetMap; map requests reveal the viewed area to the tile provider.','تُقدَّم الخريطة بواسطة OpenStreetMap وقد تكشف طلبات الخريطة المنطقة المعروضة للمزود.')}</p></>:<p className="rounded bg-amber-50 p-4">{tr(ar,'Map unavailable until a location is available.','الخريطة غير متاحة حتى يتوفر موقع.')}</p>}
 {!final&&<div className="mt-4"><p className="text-sm text-gray-600">{tr(ar,'Routes and ETA require a configured HTTPS OSRM-compatible routing service. Enabling routing sends driver and destination coordinates to that service.','يتطلب المسار والوقت المتوقع خدمة توجيه HTTPS متوافقة مع OSRM. تفعيل التوجيه يرسل إحداثيات السائق والوجهة إلى الخدمة.')}</p>{base&&<Button className="mt-2" variant="outline" onClick={()=>setRouting(!routing)}>{routing?tr(ar,'Stop routing','إيقاف التوجيه'):tr(ar,'Enable route and ETA','تفعيل المسار والوقت المتوقع')}</Button>}{routing&&(!driver||stale||!dest)&&<p className="mt-2 text-sm">{tr(ar,'A fresh driver location and destination are needed for routing.','يلزم موقع حديث للسائق والوجهة لحساب المسار.')}</p>}{routeError&&<p role="alert" className="mt-2 text-red-700">{routeError}</p>}{eta!==null&&!stale&&<p className="mt-2 font-semibold">{tr(ar,'Estimated travel time (traffic not included)','الوقت المتوقع (بدون الازدحام)')}: {eta} {tr(ar,'min','دقيقة')}</p>}</div>}</>}
 </div>;
}
