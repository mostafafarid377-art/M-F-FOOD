import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { usablePublicConfig } from "./productionConfig";

/**
 * Supabase client bootstrap.
 *
 * PostgreSQL (via Supabase) is the single source of truth. The browser only
 * ever uses the anon key — every table is protected by Row Level Security,
 * and order totals are computed server-side by the `create_order` RPC, so
 * frontend-submitted prices/totals/roles/payment statuses are never trusted.
 *
 * When the env vars are absent the app runs in "demo mode": `supabase` is
 * null and the UI falls back to bundled sample data + local simulation.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

let client: SupabaseClient | null = null;
if (usablePublicConfig(supabaseUrl, supabaseAnonKey, import.meta.env.PROD)) {
  try { client = createClient(supabaseUrl!, supabaseAnonKey!, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}); } catch { /* Do not log configuration. */ }
}
export const supabase: SupabaseClient | null = client;
export const isSupabaseConfigured = Boolean(client);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    import.meta.env.PROD ? "[M-F-FOOD] Supabase configuration unavailable." : "[M-F-FOOD] Supabase configuration unavailable; local demo mode."
  );
}

// Recovery links return to the app root with this query flag. Capture the
// recovery event before React Router can interpret Supabase's token fragment
// as a hash route (GitHub Pages uses createHashRouter).
export const isRecoveryCallback = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('auth_callback') === 'recovery';
export const recoveryReady: Promise<boolean> | null = isRecoveryCallback && supabase
  ? new Promise(resolve => {
      const params = new URLSearchParams(window.location.hash.slice(1));
      if (params.has('error') || params.has('error_code')) { resolve(false); return; }
      let done = false;
      let timeout: ReturnType<typeof setTimeout>;
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (!done && event === 'PASSWORD_RECOVERY' && session) {
          done = true; clearTimeout(timeout); subscription.unsubscribe(); resolve(true);
        }
      });
      timeout = setTimeout(() => { if (!done) { done = true; subscription.unsubscribe(); resolve(false); } }, 20000);
    }) : null;
