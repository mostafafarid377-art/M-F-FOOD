import { createClient, type SupabaseClient } from "@supabase/supabase-js";

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

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
    supabaseAnonKey &&
    !supabaseUrl.includes("your-project-ref")
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    "[M-F-FOOD] Supabase env vars missing — running in demo mode. " +
      "Copy .env.example to .env to connect a real project."
  );
}
