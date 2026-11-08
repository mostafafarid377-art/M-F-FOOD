// @vitest-environment jsdom
import React from 'react';
import {afterEach,expect,it,vi} from 'vitest';
import {act,cleanup,render,screen,waitFor} from '@testing-library/react';
const m=vi.hoisted(()=>({event:null as any,resolveA:null as any,resolveB:null as any}));
vi.mock('../lib/supabase',()=>({isSupabaseConfigured:true,supabase:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:(fn:any)=>{m.event=fn;return {data:{subscription:{unsubscribe:vi.fn()}}};}},from:()=>({select:()=>({eq:(_k:string,id:string)=>({maybeSingle:()=>new Promise(resolve=>{if(id==='a')m.resolveA=resolve;else m.resolveB=resolve;})})})})}}));
import {AuthProvider,useAuth} from './providers';
function View(){const {user}=useAuth();return <p>{user?.id||'none'}</p>}
afterEach(()=>cleanup());
it('ignores an old profile response after switching account or signing out',async()=>{
 render(<AuthProvider><View/></AuthProvider>);
 act(()=>m.event('SIGNED_IN',{user:{id:'a',email:'a@test'}}));await waitFor(()=>expect(m.resolveA).toBeTruthy());
 act(()=>m.event('SIGNED_IN',{user:{id:'b',email:'b@test'}}));await waitFor(()=>expect(m.resolveB).toBeTruthy());
 await act(async()=>m.resolveB({data:{role:'customer'}}));expect(screen.getByText('b')).toBeTruthy();
 await act(async()=>m.resolveA({data:{role:'admin'}}));expect(screen.getByText('b')).toBeTruthy();
 act(()=>m.event('SIGNED_OUT',null));expect(screen.getByText('none')).toBeTruthy();
});
