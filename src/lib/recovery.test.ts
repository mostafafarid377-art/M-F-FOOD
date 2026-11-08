// @vitest-environment jsdom
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
const m=vi.hoisted(()=>({callback:null as any,unsubscribe:vi.fn()}));
vi.mock('@supabase/supabase-js',()=>({createClient:()=>({auth:{onAuthStateChange:(fn:any)=>{m.callback=fn;return {data:{subscription:{unsubscribe:m.unsubscribe}}};}}})}));
beforeEach(()=>{vi.resetModules();vi.useFakeTimers();vi.stubEnv('VITE_SUPABASE_URL','https://example.supabase.co');vi.stubEnv('VITE_SUPABASE_ANON_KEY','sb_publishable_test');m.callback=null;m.unsubscribe.mockClear();});
afterEach(()=>{vi.useRealTimers();vi.unstubAllEnvs();window.history.replaceState(null,'','/');});
it('captures the recovery event on a Pages-style token hash before router startup',async()=>{
 window.history.replaceState(null,'','/M-F-FOOD/?auth_callback=recovery#access_token=test&refresh_token=test&type=recovery');const auth=await import('./supabase');expect(auth.isRecoveryCallback).toBe(true);m.callback('PASSWORD_RECOVERY',{user:{id:'customer'}});expect(await auth.recoveryReady).toBe(true);expect(m.unsubscribe).toHaveBeenCalled();
});
it('does not treat an existing or signed-in session as a recovery link',async()=>{
 window.history.replaceState(null,'','/?auth_callback=recovery');const auth=await import('./supabase');m.callback('INITIAL_SESSION',{user:{id:'customer'}});m.callback('SIGNED_IN',{user:{id:'customer'}});await vi.advanceTimersByTimeAsync(20000);expect(await auth.recoveryReady).toBe(false);
});
it('rejects explicit expired-link errors without using an existing session',async()=>{
 window.history.replaceState(null,'','/?auth_callback=recovery#error=access_denied&error_code=otp_expired');const auth=await import('./supabase');expect(await auth.recoveryReady).toBe(false);expect(m.callback).toBeNull();
});
