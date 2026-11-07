import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AuthUser } from '../providers';

type StaffRole = 'manager' | 'chef' | 'server' | 'cashier';
type Capabilities = { dashboard: boolean; kitchen: boolean; tables: boolean; driver: boolean };
const none: Capabilities = {dashboard:false, kitchen:false, tables:false, driver:false};
export function navigationCapabilities(role: AuthUser['role'], staff: {role: StaffRole; is_active: boolean} | null, isDriver: boolean): Capabilities {
  const admin = role === 'admin';
  const employee = role === 'staff' && staff?.is_active ? staff.role : null;
  return { dashboard: admin || employee === 'manager', kitchen: admin || employee === 'manager' || employee === 'chef', tables: admin || employee === 'manager' || employee === 'server' || employee === 'cashier', driver: isDriver };
}
export function useNavigationAccess(user: AuthUser | null, isDemoMode: boolean): Capabilities {
  const [result, setResult] = useState<{id:string; role:AuthUser['role']; capabilities:Capabilities} | null>(null);
  useEffect(() => {
    let active = true;
    if (!user || !supabase || isDemoMode) { setResult(null); return () => { active = false; }; }
    const client = supabase;
    let generation = 0;
    const load = async () => {
      const request = ++generation;
      try {
      const [staff, driver] = await Promise.all([
        client.from('staff_members').select('role,is_active').eq('profile_id',user.id).maybeSingle(),
        client.from('delivery_drivers').select('is_active').eq('profile_id',user.id).maybeSingle(),
      ]);
      if (active && request === generation) setResult({id:user.id,role:user.role,capabilities:navigationCapabilities(user.role, staff.error ? null : staff.data as {role:StaffRole;is_active:boolean}|null, !driver.error && Boolean(driver.data?.is_active))});
      } catch { if (active && request === generation) setResult({id:user.id, role:user.role, capabilities:none}); }
    };
    void load();
    const onFocus = () => { void load(); };
    window.addEventListener('focus',onFocus);
    return () => { active = false; window.removeEventListener('focus',onFocus); };
  }, [user?.id,user?.role,isDemoMode]);
  return user && result?.id === user.id && result.role === user.role && !isDemoMode ? result.capabilities : none;
}
