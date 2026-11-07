import React, { useEffect, useState } from 'react';
import { Button, Card } from '../../components/ui';
import { recoveryReady, supabase } from '../../lib/supabase';

export default function RecoveryCallback() {
  const [ready,setReady]=useState<boolean|null>(null);const [password,setPassword]=useState('');const [confirm,setConfirm]=useState('');const [show,setShow]=useState(false);const [error,setError]=useState('');const [busy,setBusy]=useState(false);const [saved,setSaved]=useState(false);
  useEffect(()=>{let active=true;void (recoveryReady ?? Promise.resolve(false)).then(value=>{if(active){ if (!value) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search); setReady(value); }});return()=>{active=false;};},[]);
  const loginUrl = `${import.meta.env.BASE_URL}${import.meta.env.BASE_URL === '/' ? 'login' : '#/login'}`;
  const submit=async(e:React.FormEvent)=>{e.preventDefault();if(!supabase||!ready)return;
    if(password.length<6){setError('Password must be at least 6 characters.');return;}
    if(password!==confirm){setError('Passwords do not match.');return;}
    setBusy(true);setError('');try{const {error:e}=await supabase.auth.updateUser({password});if(e)throw e;setSaved(true);await supabase.auth.signOut({scope:'local'});}catch(e){setError(e instanceof Error?e.message:'Could not update your password.');}finally{setBusy(false);}
  };
  return <div className="mx-auto max-w-md px-4 py-16"><Card className="p-6"><h1 className="text-2xl font-bold text-primary">Reset password</h1>
    {ready===null?<p className="mt-4">Checking your reset link…</p>:!ready?<p role="alert" className="mt-4 text-red-700">This reset link is invalid or expired. Please request a new one.</p>:saved?<p role="status" className="mt-4 rounded bg-green-50 p-3 text-green-800">Your password has been updated. You can now log in.</p>:<form onSubmit={submit} className="mt-4 space-y-4"><label className="block text-sm font-medium" htmlFor="new-password">New password<input id="new-password" required autoComplete="new-password" type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label><label className="block text-sm font-medium" htmlFor="confirm-password">Confirm new password<input id="confirm-password" required autoComplete="new-password" type={show?'text':'password'} value={confirm} onChange={e=>setConfirm(e.target.value)} className="mt-1 w-full rounded-md border border-primary-200 px-3 py-2" /></label><button type="button" className="text-sm font-medium text-primary underline" aria-pressed={show} onClick={()=>setShow(!show)}>{show?'Hide passwords':'Show passwords'}</button>{error&&<p role="alert" className="rounded bg-red-50 p-3 text-red-700">{error}</p>}<Button type="submit" fullWidth disabled={busy}>{busy?'Saving…':'Save new password'}</Button></form>}
    {(saved||ready===false)&&<p className="mt-4 text-sm"><a className="text-primary underline" href={loginUrl}>Back to login</a></p>}
  </Card></div>;
}
