import React, { useCallback, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ButtonLink, Button, Card } from '../../components/ui';
import { useAuth, useLayout } from '../../app/providers';
import { formatEGP } from '../../lib/format';
import { supabase } from '../../lib/supabase';
import { statusText, tr, useArabic } from './Shell';
import { useRealtimeRefresh } from './live';

type Table = {id:string;table_number:number;name:string;status:string;is_active:boolean};
type Session = {id:string;table_id:string;opened_at:string;closed_at:string|null};
type LinkRow = {session_id:string;order_id:string};
type Order = {id:string;status:string;total_price:number};
const blank = {id:'', table_number:'',name:'',status:'available',is_active:true};
export default function Tables() {
  const {user} = useAuth(); const {currencySymbol}=useLayout(); const ar=useArabic();
  const [tables,setTables]=useState<Table[]>([]); const [sessions,setSessions]=useState<Session[]>([]); const [links,setLinks]=useState<LinkRow[]>([]); const [orders,setOrders]=useState<Order[]>([]);
  const [form,setForm]=useState(blank); const [orderId,setOrderId]=useState(''); const [error,setError]=useState(''); const [notice,setNotice]=useState(''); const [busy,setBusy]=useState(false); const [loading,setLoading]=useState(true);const generation=useRef(0);
  const load=useCallback(async()=>{
    if(!supabase)return;
    const request=++generation.current;
    const client=supabase;
    try {
      const pages=async<T,>(fetchPage:(start:number,end:number)=>PromiseLike<{data:unknown[]|null;error:{message:string}|null}>):Promise<T[]>=>{
        const rows:T[]=[];for(let start=0;;start+=500){const result=await fetchPage(start,start+499);if(result.error)throw result.error;rows.push(...(result.data||[]) as T[]);if((result.data?.length||0)<500)break;}return rows;
      };
      const [tableRows,sessionRows]=await Promise.all([
        pages<Table>((start,end)=>client.from('restaurant_tables').select('*').order('table_number').range(start,end)),
        pages<Session>((start,end)=>client.from('dining_sessions').select('*').is('closed_at',null).order('id').range(start,end))
      ]);
      const activeLinks:LinkRow[]=[];const found:Order[]=[];
      for(let i=0;i<sessionRows.length;i+=100){
        const batch=sessionRows.slice(i,i+100).map(row=>row.id);
        activeLinks.push(...await pages<LinkRow>((start,end)=>client.from('dining_session_orders').select('session_id,order_id').in('session_id',batch).order('order_id').range(start,end)));
      }
      for(let i=0;i<activeLinks.length;i+=100){
        const ids=activeLinks.slice(i,i+100).map(row=>row.order_id);
        const result=await client.from('orders').select('id,status,total_price').in('id',ids);if(result.error)throw result.error;found.push(...result.data as Order[]);
      }
      if(request!==generation.current)return;
      setTables(tableRows);setSessions(sessionRows);setLinks(activeLinks);setOrders(found);setError('');setLoading(false);
    }catch(e){if(request===generation.current){setError((e as {message?:string}).message||'Unable to load tables');setLoading(false);}}
  },[]);
  const connection=useRealtimeRefresh(['restaurant_tables','dining_sessions','dining_session_orders','orders'],()=>void load());
  const call=async(name:string,args:Record<string,unknown>)=>{if(!supabase||busy)return;setBusy(true);setError('');setNotice('');try{const {error:e}=await supabase.rpc(name,args);if(e)throw e;setNotice(tr(ar,'Saved successfully.','تم الحفظ بنجاح.'));await load();return true;}catch(e){setError((e as {message?:string}).message||'Request failed');return false;}finally{setBusy(false);}};
  const save=async(e:React.FormEvent)=>{e.preventDefault();const ok=await call('save_restaurant_table',{p_id:form.id||null,p_number:Number(form.table_number),p_name:form.name,p_status:form.status,p_active:form.is_active});if(ok)setForm(blank);};
  const names:Record<string,string>=ar?{available:'متاحة',occupied:'مشغولة',reserved:'محجوزة',cleaning:'تنظيف'}:{available:'Available',occupied:'Occupied',reserved:'Reserved',cleaning:'Cleaning'};
  return <div className="mx-auto max-w-7xl px-4 py-8"><div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm text-primary">M-F-FOOD</p><h1 className="text-3xl font-bold">{tr(ar,'Table management','إدارة الطاولات')}</h1><p className="text-sm text-gray-500">{statusText(ar,connection)}</p></div><ButtonLink to="/admin" variant="outline">{tr(ar,'Dashboard','لوحة الإدارة')}</ButtonLink></div>
    {error&&<p role="alert" className="mb-4 rounded bg-red-50 p-3 text-red-700">{error}</p>}{notice&&<p role="status" className="mb-4 rounded bg-green-50 p-3 text-green-700">{notice}</p>}
    {user?.role==='admin'&&<Card className="mb-6 p-4"><h2 className="mb-3 text-xl font-bold">{form.id?tr(ar,'Edit table','تعديل الطاولة'):tr(ar,'Add table','إضافة طاولة')}</h2><form onSubmit={save} className="flex flex-wrap items-end gap-3"><label className="text-sm">{tr(ar,'Number','الرقم')}<input required min="1" type="number" className="block rounded border p-2" value={form.table_number} onChange={e=>setForm({...form,table_number:e.target.value})}/></label><label className="text-sm">{tr(ar,'Name','الاسم')}<input className="block rounded border p-2" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label><label className="text-sm">{tr(ar,'Status','الحالة')}<select className="block rounded border p-2" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>{['available','reserved','cleaning'].map(x=><option key={x} value={x}>{names[x]}</option>)}</select></label><label className="flex gap-2"><input type="checkbox" checked={form.is_active} onChange={e=>setForm({...form,is_active:e.target.checked})}/>{tr(ar,'Active','نشطة')}</label><Button type="submit" disabled={busy}>{tr(ar,'Save','حفظ')}</Button>{form.id&&<Button variant="ghost" onClick={()=>setForm(blank)}>{tr(ar,'Cancel','إلغاء')}</Button>}</form></Card>}
    {loading&&<p>{tr(ar,'Loading…','جار التحميل…')}</p>}{!loading&&!tables.length&&<p>{tr(ar,'No tables configured.','لا توجد طاولات.')}</p>}
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tables.map(t=>{const session=sessions.find(s=>s.table_id===t.id);const sessionOrders=orders.filter(o=>links.some(l=>l.session_id===session?.id&&l.order_id===o.id));const sum=sessionOrders.filter(o=>o.status!=='cancelled').reduce((a,o)=>a+o.total_price,0);return <Card key={t.id} className="p-5"><div className="flex justify-between gap-2"><div><h2 className="text-xl font-bold">{tr(ar,'Table','طاولة')} {t.table_number} {t.name&&`· ${t.name}`}</h2><p className="text-sm text-gray-500">{t.is_active?'':tr(ar,'Inactive','غير نشطة')}</p></div><span className={`h-fit rounded-full px-3 py-1 text-sm font-bold ${t.status==='available'?'bg-green-100 text-green-800':t.status==='occupied'?'bg-orange-100 text-orange-800':'bg-blue-100 text-blue-800'}`}>{names[t.status]||t.status}</span></div>
      {session&&<div className="mt-4"><p className="text-sm text-gray-600">{tr(ar,'Opened','افتتحت')}: {new Date(session.opened_at).toLocaleString()}</p><ul className="mt-2 text-sm">{sessionOrders.map(o=><li key={o.id}>#{o.id.slice(0,8)} · {statusText(ar,o.status)} · {formatEGP(o.total_price,currencySymbol)}</li>)}</ul><p className="font-semibold">{tr(ar,'Total','الإجمالي')}: {formatEGP(sum,currencySymbol)}</p><form className="mt-2 flex gap-2" onSubmit={e=>{e.preventDefault();void call('attach_order_to_session',{p_session_id:session.id,p_order_id:orderId}).then(ok=>{if(ok)setOrderId('');});}}><input aria-label={tr(ar,'Order UUID','معرّف الطلب')} placeholder={tr(ar,'Existing order UUID','معرّف الطلب الموجود')} value={orderId} onChange={e=>setOrderId(e.target.value)} className="min-w-0 flex-1 rounded border p-2"/><Button type="submit" size="sm" disabled={!orderId||busy}>{tr(ar,'Attach','ربط')}</Button></form></div>}
      <div className="mt-4 flex flex-wrap gap-2">{session?<Button variant="outline" disabled={busy} onClick={()=>void call('close_dining_session',{p_session_id:session.id})}>{tr(ar,'Close session','إغلاق الجلسة')}</Button>:t.is_active&&['available','reserved'].includes(t.status)&&<Button disabled={busy} onClick={()=>void call('open_dining_session',{p_table_id:t.id})}>{tr(ar,'Open session','فتح جلسة')}</Button>}{user?.role==='admin'&&!session&&<Button variant="ghost" onClick={()=>setForm({id:t.id,table_number:String(t.table_number),name:t.name,status:t.status==='occupied'?'available':t.status,is_active:t.is_active})}>{tr(ar,'Edit','تعديل')}</Button>}</div></Card>;})}</div>
  </div>;
}
