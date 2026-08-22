"use client";

import { useRef, useState } from "react";
import { Upload, Loader2, Trash2, AlertTriangle, ImageIcon } from "lucide-react";
import { uploadContentImage, IMAGE_ACCEPT } from "@/lib/content-images";

/**
 * Dashboard image field: pick a file, it uploads to the content-images bucket
 * and the resulting public URL is handed back through onChange. Replaces the
 * old Google Drive link input.
 */
export default function ImageUpload({
  label,
  value,
  onChange,
  hint,
  aspect = "video",
}: {
  label: string;
  /** Current stored image URL (empty when none). */
  value: string;
  onChange: (url: string) => void;
  hint?: string;
  aspect?: "video" | "square";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    const res = await uploadContentImage(file);
    setBusy(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    onChange(res.url!);
  };

  const aspectClass = aspect === "square" ? "aspect-square" : "aspect-video";

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>

      <input
        ref={inputRef}
        type="file"
        accept={IMAGE_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {value ? (
        <div className="flex items-start gap-3">
          <div
            className={`relative w-40 ${aspectClass} shrink-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt="Preview"
              className="h-full w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {busy ? "Mengunggah…" : "Ganti gambar"}
            </button>
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-red-600 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Hapus
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50/40 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
          ) : (
            <ImageIcon className="h-6 w-6 text-gray-400" />
          )}
          <span className="text-sm font-medium text-gray-700">
            {busy ? "Mengunggah…" : "Pilih gambar"}
          </span>
        </button>
      )}

      <p className="mt-1.5 text-xs text-gray-400">
        JPG, PNG, atau WEBP · Maksimal 2 MB.{hint ? ` ${hint}` : ""}
      </p>

      {error && (
        <p className="mt-1.5 flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
