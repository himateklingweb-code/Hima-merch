import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/**
 * Lets the admin dashboard clear the ISR cache for the public pages it just
 * changed, instead of staff waiting out the revalidate window (up to five
 * minutes) to see their own edit go live.
 *
 * Authorization reuses the caller's existing Supabase session rather than a
 * separate secret: the bearer token is resolved to a user, and that user
 * must have a `staff` row — the same gate RLS already enforces on the
 * writes themselves.
 */
export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi." }, { status: 500 });
  }

  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: staffRow } = await supabase
    .from("staff")
    .select("id")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (!staffRow) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const paths = Array.isArray(body?.paths) ? body.paths : [];
  const revalidated: string[] = [];
  for (const p of paths) {
    if (typeof p === "string" && p.startsWith("/")) {
      revalidatePath(p);
      revalidated.push(p);
    }
  }

  return NextResponse.json({ ok: true, revalidated });
}
