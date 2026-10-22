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
let cachedPublic: SupabaseClient | null = null;

/**
 * Client for server components.
 *
 * Deliberately separate from the browser one: no session storage, no token
 * refresh. Server rendering only ever reads public content, which RLS
 * exposes to the anon role anyway, and a shared mutable session on the
 * server would leak between requests.
 *
 * Fungsi ini juga dipanggil dari komponen klien (dashboard admin). Di browser
 * klien dibuat sekali dan memakai storageKey sendiri, supaya tidak muncul
 * banyak GoTrueClient yang berebut kunci sesi login.
 */
export function getServerSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && cachedPublic) return cachedPublic;
  const client = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: "sb-hmtl-public-read",
    },
  });
  if (isBrowser) cachedPublic = client;
  return client;
}

export function getSupabase(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  if (!cached) {
    cached = createClient(url, anonKey, {
      auth: {
        // Staff and customers both sign in with Supabase Auth, so the session
        // has to survive a reload and refresh itself.
        persistSession: true,
        autoRefreshToken: true,
        // PKCE for the Google OAuth flow. The /auth/callback page exchanges
        // the returned code for a session explicitly, so URL detection stays
        // off (nothing else in the app expects tokens in the URL).
        flowType: "pkce",
        detectSessionInUrl: false,
      },
    });
  }
  return cached;
}
