"use client";

import { useEffect } from "react";
import Link from "next/link";

/**
 * Last-resort boundary for an unhandled render error. Shows something
 * useful rather than a blank page, and offers a retry — most failures here
 * are transient (a dropped database call, a flaky network).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Swap for a real error reporter (Sentry et al.) when there is one.
    console.error("Unhandled application error:", error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="mb-3 text-[11px] uppercase tracking-[.22em] text-gray-400">
        Terjadi kesalahan
      </p>
      <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-3xl">
        Ada yang tidak beres
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-gray-500">
        Halaman ini gagal dimuat. Coba muat ulang — kalau masih bermasalah,
        hubungi pengurus HIMA TL.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Coba lagi
        </button>
        <Link
          href="/"
          className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Kembali ke beranda
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-[10px] text-gray-300">
          ref: {error.digest}
        </p>
      )}
    </div>
  );
}
