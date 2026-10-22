"use client";

import { Search, X } from "lucide-react";

/**
 * Kotak pencarian kecil untuk daftar di panel admin. Satu komponen dipakai
 * ulang di semua halaman supaya tampilan dan perilakunya sama.
 */
export default function AdminSearch({
  value,
  onChange,
  placeholder = "Cari…",
  total,
  shown,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  /** Jumlah semua data dan yang tampil, untuk teks "x dari y". */
  total?: number;
  shown?: number;
  /** Filter tambahan (select/tombol) di sebelah kotak cari. */
  children?: React.ReactNode;
}) {
  const filtering = value.trim() !== "";
  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center">
      <label className="relative flex-1 sm:max-w-xs">
        <span className="sr-only">{placeholder}</span>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="Hapus pencarian"
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </label>
      {children}
      {total != null && shown != null && (filtering || shown !== total) && (
        <span className="text-xs text-gray-500 sm:ml-auto" aria-live="polite">
          {shown} dari {total}
        </span>
      )}
    </div>
  );
}
