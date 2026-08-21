"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, AlertTriangle } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

/**
 * Where Google (and email-confirmation links) return to.
 *
 * The sign-in was started with the PKCE flow, so the URL carries a one-time
 * `code` we swap for a real session. Email-confirmation links may instead
 * carry `token_hash` + `type`, handled via verifyOtp. Everything runs
 * client-side to match the rest of the app's auth.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }

    const url = new URL(window.location.href);
    const params = url.searchParams;
    const dest = (() => {
      const r = params.get("redirect");
      return r && r.startsWith("/") && !r.startsWith("//") ? r : "/akun";
    })();

    // The provider can bounce back with an explicit error (e.g. access denied).
    const providerError =
      params.get("error_description") || params.get("error");

    (async () => {
      if (providerError) {
        setError(decodeURIComponent(providerError));
        return;
      }

      const code = params.get("code");
      const tokenHash = params.get("token_hash");
      const type = params.get("type");

      let failed: string | null = null;

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) failed = error.message;
      } else if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          type: type as any,
        });
        if (error) failed = error.message;
      } else {
        // No code in the URL — maybe the session was already established.
        const { data } = await supabase.auth.getSession();
        if (!data.session) failed = "Tautan masuk tidak valid atau kedaluwarsa.";
      }

      if (failed) {
        setError(failed);
        return;
      }
      router.replace(dest);
    })();
  }, [router]);

  if (error) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <AlertTriangle className="mx-auto mb-4 h-10 w-10 text-red-400" />
        <h1 className="text-lg font-bold text-gray-900">Gagal masuk</h1>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <Link
          href="/masuk"
          className="mt-6 inline-block text-sm font-medium text-emerald-700 hover:underline"
        >
          Coba masuk lagi
        </Link>
      </div>
    );
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
      <Loader2 className="h-7 w-7 animate-spin text-emerald-600" />
      <p className="text-sm text-gray-500">Menyelesaikan proses masuk…</p>
    </div>
  );
}
