import { getSupabase } from "./supabase";

/**
 * Asks the server to clear the ISR cache for the given public paths right
 * after an admin write, so the change is visible immediately instead of
 * waiting out the revalidate window. Best-effort: if this fails (offline,
 * session hiccup), the normal ISR timer still catches up on its own — a
 * page just stays stale a little longer, nothing breaks.
 */
export async function revalidatePublicPaths(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const supabase = getSupabase();
  if (!supabase) return;

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return;

  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths }),
    });
  } catch {
    // Best-effort — see doc comment above.
  }
}
