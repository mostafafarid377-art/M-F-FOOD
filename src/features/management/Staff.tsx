import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '../../components/ui';
import { supabase } from '../../lib/supabase';

type Staff = { id: string; role: 'manager' | 'chef' | 'server' | 'cashier'; is_active: boolean; profiles: { full_name: string | null; role: string } | null };
export default function StaffManagement() {
  const [staff, setStaff] = useState<Staff[]>([]); const [admins, setAdmins] = useState<{ id: string; full_name: string | null }[]>([]); const [error, setError] = useState(''); const [busy, setBusy] = useState('');
  const load = useCallback(async () => { if (!supabase) return; const [result, adminResult] = await Promise.all([supabase.from('staff_members').select('id,role,is_active,profiles(full_name,role)').order('created_at'), supabase.from('profiles').select('id,full_name').eq('role', 'admin')]); if (result.error || adminResult.error) setError(result.error?.message ?? adminResult.error?.message ?? 'Unable to load staff'); else { setStaff(result.data as unknown as Staff[]); setAdmins(adminResult.data); } }, []);
  useEffect(() => { void load(); }, [load]);
  const update = async (member: Staff, patch: { role?: Staff['role']; is_active?: boolean }) => {
    if (!supabase) return; setBusy(member.id); setError('');
    const result = await supabase.from('staff_members').update(patch).eq('id', member.id).select('id').single();
    if (result.error) setError(result.error.message); await load(); setBusy('');
  };
  return <Card className="p-5"><h2 className="text-xl font-bold">Staff accounts</h2><p className="mb-4 text-sm text-gray-500">Only administrators can manage staff. A staff profile and an active matching role are both required for access.</p>{error && <p role="alert" className="text-red-700">{error}</p>}<h3 className="mt-4 font-semibold">Administrators</h3><ul className="mb-4 text-sm text-gray-600">{admins.map(a => <li key={a.id}>{a.full_name || `Admin ${a.id.slice(0, 8)}`}</li>)}</ul><h3 className="font-semibold">Staff members</h3><div className="divide-y">{staff.map(s => <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 py-4"><div><strong>{s.profiles?.full_name || 'Unnamed staff'}</strong><p className="text-sm text-gray-500">Profile: {s.profiles?.role ?? 'Unavailable'} · {s.is_active ? 'Active' : 'Inactive'}</p></div><div className="flex gap-2"><label className="sr-only" htmlFor={`role-${s.id}`}>Staff role</label><select id={`role-${s.id}`} disabled={busy === s.id} value={s.role} className="rounded border p-2" onChange={e => void update(s, { role: e.target.value as Staff['role'] })}><option value="manager">Manager</option><option value="chef">Chef</option><option value="server">Server</option><option value="cashier">Cashier</option></select><Button variant="outline" disabled={busy === s.id} onClick={() => void update(s, { is_active: !s.is_active })}>{s.is_active ? 'Deactivate' : 'Activate'}</Button></div></div>)}{!staff.length && !error && <p className="py-4 text-gray-500">No staff records found. See README for secure account setup.</p>}</div></Card>;
}
