"use client";

import { Database, AlertTriangle, Loader2 } from "lucide-react";

/**
 * Tells the editor whether they are looking at real data and whether their
 * last write landed. Without this the old screens failed silently — an edit
 * appeared to work and vanished on refresh.
 */
export default function DbStatus({
  live,
  loading,
  error,
  saving,
}: {
  live: boolean;
  loading?: boolean;
  error?: string | null;
  saving?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {saving && (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full bg-gray-100 text-gray-600">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Menyimpan…
        </span>
      )}

      <span
        className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full ${
          live
            ? "bg-emerald-50 text-emerald-700"
            : "bg-amber-50 text-amber-700"
        }`}
        title={
          live
            ? "Perubahan tersimpan ke Supabase"
            : "Supabase belum dikonfigurasi — perubahan tidak akan tersimpan"
        }
      >
        <Database className="w-3.5 h-3.5" />
        {loading ? "Memuat…" : live ? "Data live" : "Data contoh"}
      </span>

      {error && (
        <span className="inline-flex items-start gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 max-w-md">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{error}</span>
        </span>
      )}
    </div>
  );
}
