import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui';

const Lang = createContext(false);
export const useArabic = () => useContext(Lang);
export const tr = (ar: boolean, en: string, arabic: string) => ar ? arabic : en;
export function statusText(ar: boolean, value: string) {
  const arabic: Record<string,string> = { pending:'قيد الانتظار', confirmed:'مقبول', preparing:'قيد التحضير', ready:'جاهز للاستلام', unassigned:'غير معين', assigned:'معين لسائق', picked_up:'تم الاستلام', on_the_way:'في الطريق', delivered:'تم التسليم', completed:'مكتمل', cancelled:'ملغي', available:'متاح', occupied:'مشغول', reserved:'محجوز', cleaning:'تنظيف', Connecting:'جار الاتصال', Live:'مباشر', Reconnecting:'إعادة الاتصال' };
  return ar ? (arabic[value] || value) : value.replace(/_/g, ' ');
}
export function Phase5Shell({ children }: { children: React.ReactNode }) {
  const [ar, setAr] = useState(() => localStorage.getItem('mf-food-phase5-language') === 'ar');
  const toggle = () => setAr(value => { localStorage.setItem('mf-food-phase5-language', value ? 'en' : 'ar'); return !value; });
  return <Lang.Provider value={ar}><div dir={ar ? 'rtl' : 'ltr'} lang={ar ? 'ar' : 'en'}><div className="mx-auto flex max-w-7xl justify-end px-4 pt-4"><Button variant="outline" size="sm" onClick={toggle}>{ar ? 'English' : 'العربية'}</Button></div>{children}</div></Lang.Provider>;
}

export function FloorGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isDemoMode } = useAuth(); const [allowed, setAllowed] = useState<boolean | null>(null); const location = useLocation();
  useEffect(() => {
    let active = true; setAllowed(null);
    if (!user || !supabase || isDemoMode) return () => { active = false; };
    if (user.role === 'admin') setAllowed(true);
    else if (user.role === 'staff') supabase.from('staff_members').select('role,is_active').eq('profile_id', user.id).maybeSingle().then(({data}) => { if (active) setAllowed(Boolean(data?.is_active && ['manager','server','cashier'].includes(data.role))); });
    else setAllowed(false);
    return () => { active = false; };
  }, [user?.id, user?.role, isDemoMode]);
  if (isLoading) return <p className="p-8">Loading…</p>;
  if (!user) return <p className="p-8">Login required. <Link className="text-primary underline" to="/login" state={{from: location.pathname}}>Sign in</Link></p>;
  if (!supabase || isDemoMode) return <p className="p-8">A Supabase account is required.</p>;
  if (allowed === null) return <p className="p-8">Checking access…</p>;
  if (!allowed) return <p className="p-8">Access denied.</p>;
  return <>{children}</>;
}
