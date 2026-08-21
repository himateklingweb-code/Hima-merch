"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, AlertTriangle, Loader2 } from "lucide-react";
import { getSupabase } from "@/lib/supabase";

export default function AdminLoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const supabase = getSupabase();
    if (!supabase) {
      setError(
        "Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu."
      );
      return;
    }

    setBusy(true);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (authError || !data.user) {
      setBusy(false);
      // Deliberately vague: distinguishing "wrong password" from "no such
      // account" tells an attacker which emails are real.
      setError("Email atau kata sandi salah.");
      return;
    }

    // Signing in is not enough — the account also needs a `staff` row, which
    // is what every dashboard RLS policy actually checks.
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("id", data.user.id)
      .maybeSingle();

    if (!staff) {
      await supabase.auth.signOut();
      setBusy(false);
      setError(
        "Akun ini belum terdaftar sebagai pengurus. Hubungi admin HMTL."
      );
      return;
    }

    router.replace("/admin");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-800 to-teal-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center text-white font-bold text-2xl mx-auto mb-4">
            TL
          </div>
          <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
          <p className="text-emerald-200 text-sm mt-1">
            HIMA Teknik Lingkungan UNTAN
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-xl">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Masuk</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="nama@himatl.com"
                className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={
                    showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold py-3 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-60"
            >
              {busy && <Loader2 className="w-4 h-4 animate-spin" />}
              {busy ? "Memeriksa…" : "Masuk"}
            </button>
          </form>

          <p className="mt-4 text-xs text-gray-400">
            Akses khusus pengurus HMTL. Akun dibuat oleh admin melalui
            Supabase.
          </p>
        </div>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-sm text-emerald-200 hover:text-white transition-colors"
          >
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
