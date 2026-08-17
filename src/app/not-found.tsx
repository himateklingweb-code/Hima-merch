import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
      <p className="mb-3 text-[11px] uppercase tracking-[.22em] text-gray-400">
        404
      </p>
      <h1 className="mb-3 text-2xl font-bold text-gray-900 sm:text-4xl">
        Halaman tidak ditemukan
      </h1>
      <p className="mb-8 text-sm leading-relaxed text-gray-500 sm:text-base">
        Tautannya mungkin sudah berubah atau salah ketik. Coba kembali ke
        beranda atau telusuri lewat menu.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/"
          className="rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          Kembali ke beranda
        </Link>
        <Link
          href="/berita"
          className="rounded-lg border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Lihat berita
        </Link>
      </div>
    </div>
  );
}
