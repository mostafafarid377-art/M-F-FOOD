// @vitest-environment jsdom
import { afterEach,expect,it,vi } from 'vitest';
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();window.localStorage.clear();window.history.replaceState(null,'','/');});
it('real Supabase auth client consumes a recovery fragment and emits the event before a hash router starts',async()=>{
 vi.resetModules();vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('VITE_SUPABASE_ANON_KEY','test-anon-key');
 const fetchMock=vi.fn(async()=>new Response(JSON.stringify({id:'11111111-1111-4111-8111-111111111111',aud:'authenticated',role:'authenticated',email:'customer@example.com',app_metadata:{},user_metadata:{}}),{status:200,headers:{'Content-Type':'application/json'}}));vi.stubGlobal('fetch',fetchMock);
 window.history.replaceState(null,'','/M-F-FOOD/?auth_callback=recovery#access_token=test-access&refresh_token=test-refresh&expires_in=3600&token_type=bearer&type=recovery');
 const auth=await import('./supabase');expect(await auth.recoveryReady).toBe(true);expect(window.location.hash).toBe('');expect(fetchMock).toHaveBeenCalled();await auth.supabase?.auth.stopAutoRefresh();
},10000);
