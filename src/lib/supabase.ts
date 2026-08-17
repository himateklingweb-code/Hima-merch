import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase access.
 *
 * Both values are public by design — the anon key is safe in the browser
 * because row level security decides what it may touch (see
 * supabase/schema.sql). Put them in `.env.local`:
 *
 *   NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
 *
 * When they are absent the app still runs: every call site falls back to
 * the seeded demo data, so the site is never broken by a missing config.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: {
        // The dashboard signs staff in with Supabase Auth, so the session
        // has to survive a reload and refresh itself.
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}
