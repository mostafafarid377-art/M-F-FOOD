import React, { createContext, useContext, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/providers';
import { supabase } from '../../lib/supabase';

export type Access = 'admin' | 'manager' | 'chef' | 'server' | 'cashier';
const AccessContext = createContext<Access>('chef');
export const useManagementAccess = () => useContext(AccessContext);

export function ManagementGate({ children, kitchen = false }: { children: React.ReactNode; kitchen?: boolean }) {
  const { user, isLoading, isDemoMode } = useAuth();
  const location = useLocation();
  const [state, setState] = useState<{ userId: string; role: Access | null; error?: string } | null>(null);
  useEffect(() => {
    let alive = true;
    setState(null);
    if (!user || !supabase || isDemoMode) return () => { alive = false; };
    if (user.role === 'admin') {
      setState({ userId: user.id, role: 'admin' });
    } else if (user.role === 'staff') {
      supabase.from('staff_members').select('role,is_active').eq('profile_id', user.id).maybeSingle().then(({ data, error }) => {
        if (!alive) return;
        const role = !error && data?.is_active && ['manager', 'chef', 'server', 'cashier'].includes(data.role) ? data.role as Access : null;
        setState({ userId: user.id, role, error: error?.message });
      });
    } else setState({ userId: user.id, role: null });
    return () => { alive = false; };
  }, [user?.id, user?.role, isDemoMode]);
  if (isLoading || (user && supabase && (!state || state.userId !== user.id))) return <p className="p-8">Checking access…</p>;
  if (!user) return <div className="mx-auto max-w-lg p-8"><h1 className="text-2xl font-bold">Login required</h1><Link className="text-primary underline" to="/login" state={{ from: location.pathname }}>Sign in</Link></div>;
  if (isDemoMode) return <div className="p-8">Management requires a real Supabase account. Demo users cannot access this screen.</div>;
  if (!state?.role || (!kitchen && state.role !== 'admin' && state.role !== 'manager')) return <div className="p-8"><h1 className="text-2xl font-bold">Access denied</h1><p>{state?.error ?? 'Your account is not authorized for this page.'}</p></div>;
  return <AccessContext.Provider value={state.role}>{children}</AccessContext.Provider>;
}
