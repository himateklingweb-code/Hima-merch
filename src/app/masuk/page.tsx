"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  MailCheck,
  ShoppingBag,
} from "lucide-react";
import { useAuth } from "@/components/AuthContext";

/** Google "G" mark — inline so it needs no external asset under the CSP. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.62z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.47.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
      />
    </svg>
  );
}

/** Only ever redirect to an in-app path, never an attacker-supplied URL. */
function safeRedirect(raw: string | null): string {
  return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/akun";
}

function MasukInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = safeRedirect(params.get("redirect"));
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail } =
    useAuth();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmSent, setConfirmSent] = useState(false);

  // Already signed in? Nothing to do here — go where they were headed.
  useEffect(() => {
    if (!loading && user) router.replace(redirect);
  }, [loading, user, redirect, router]);

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    const { error } = await signInWithGoogle(redirect);
    // On success the browser navigates away; only reach here on failure.
    if (error) {
      setError(error);
      setBusy(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Email dan kata sandi wajib diisi.");
      return;
    }
    if (mode === "signup" && password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }

    setBusy(true);
    if (mode === "signin") {
      const { error } = await signInWithEmail(email, password);
      if (error) {
        setError(error);
        setBusy(false);
        return;
      }
      router.replace(redirect);
    } else {
      const { error, needsConfirmation } = await signUpWithEmail(
        email,
        password,
        name
      );
      if (error) {
        setError(error);
        setBusy(false);
        return;
      }
      if (needsConfirmation) {
        setConfirmSent(true);
        setBusy(false);
        return;
      }
      router.replace(redirect);
    }
  };

  if (confirmSent) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <MailCheck className="mx-auto mb-4 h-12 w-12 text-emerald-600" />
        <h1 className="text-xl font-bold text-gray-900">Cek email kamu</h1>
        <p className="mt-2 text-sm text-gray-500">
          Kami mengirim tautan konfirmasi ke{" "}
          <span className="font-medium text-gray-700">{email}</span>. Klik
          tautan itu untuk mengaktifkan akun, lalu masuk untuk memesan.
        </p>
        <button
          onClick={() => {
            setConfirmSent(false);
            setMode("signin");
          }}
          className="mt-6 text-sm font-medium text-emerald-700 hover:underline"
        >
          Kembali ke halaman masuk
        </button>
      </div>
    );
  }

  const field =
    "w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";

  return (
    <div className="mx-auto max-w-md px-4 py-10 sm:py-16">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <ShoppingBag className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">
          {mode === "signin" ? "Masuk" : "Buat akun"}
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {redirect === "/keranjang"
            ? "Masuk dulu untuk menyelesaikan pesanan."
            : "Masuk untuk memesan merchandise dan melihat riwayat pesanan."}
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          <GoogleMark />
          Lanjutkan dengan Google
        </button>

        <div className="my-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gray-200" />
          <span className="text-xs text-gray-400">atau pakai email</span>
          <span className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nama Lengkap
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama sesuai KTM"
                autoComplete="name"
                className={field}
              />
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="nama@email.com"
              className={field}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Kata sandi
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete={
                  mode === "signin" ? "current-password" : "new-password"
                }
                placeholder={mode === "signup" ? "Minimal 8 karakter" : ""}
                className={`${field} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                aria-label={
                  showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
                }
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {error && (
            <div className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-800">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-60"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === "signin" ? "Masuk" : "Buat akun"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-gray-500">
          {mode === "signin" ? "Belum punya akun? " : "Sudah punya akun? "}
          <button
            type="button"
            onClick={() => {
              setMode((m) => (m === "signin" ? "signup" : "signin"));
              setError(null);
            }}
            className="font-medium text-emerald-700 hover:underline"
          >
            {mode === "signin" ? "Buat akun" : "Masuk"}
          </button>
        </p>
      </div>

      <p className="mt-6 text-center text-sm">
        <Link href="/merchandise" className="text-emerald-700 hover:underline">
          ← Kembali ke merchandise
        </Link>
      </p>
    </div>
  );
}

export default function MasukPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[50vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
        </div>
      }
    >
      <MasukInner />
    </Suspense>
  );
}
