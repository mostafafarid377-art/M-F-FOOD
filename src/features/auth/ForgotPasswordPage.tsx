import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card } from '../../components/ui';
import { supabase } from '../../lib/supabase';

export function recoveryRedirectUrl(): string {
  const url = new URL(import.meta.env.BASE_URL, window.location.origin);
  url.searchParams.set('auth_callback', 'recovery');
  return url.toString();
}
export default function ForgotPasswordPage() {
  const [email,setEmail] = useState(''); const [busy,setBusy]=useState(false); const [sent,setSent]=useState(false); const [error,setError]=useState('');
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); if (!supabase) return;
    setBusy(true);setError('');
    try { const {error:e}=await supabase.auth.resetPasswordForEmail(email.trim(),{redirectTo:recoveryRedirectUrl()}); if(e) throw e; setSent(true); }
    catch(e){setError(e instanceof Error ? e.message : 'Could not request a reset link.');} finally {setBusy(false);}
  };
  return <div className="mx-auto max-w-md px-4 py-16"><Card className="p-6"><h1 className="text-2xl font-bold text-primary">Forgot password?</h1>
    {!supabase ? <p className="mt-4 text-gray-600">Password recovery requires a connected Supabase account and is not available for local demo accounts.</p> : sent ? <p role="status" className="mt-4 rounded bg-green-50 p-3 text-green-800">If an account exists for this email, a reset link has been sent. Check your inbox and spam folder.</p> : <form onSubmit={submit} className="mt-4 space-y-4"><p className="text-sm text-gray-600">Enter your email and we’ll send you a password reset link.</p><label className="block text-sm font-medium" htmlFor="reset-email">Email<input id="reset-email" required type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2"/></label>{error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<Button type="submit" fullWidth disabled={busy}>{busy?'Sending…':'Send reset link'}</Button></form>}
    <p className="mt-4 text-sm"><Link className="text-primary underline" to="/login">Back to login</Link></p>
  </Card></div>;
}
