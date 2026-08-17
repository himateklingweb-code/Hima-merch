"use client";

import { useRef, useState } from "react";
import { Upload, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import { uploadPaymentProof } from "@/lib/orders-repo";

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

/**
 * Lets a buyer attach their transfer receipt from the tracker page.
 *
 * They are not signed in — the order code is what authorises the write, and
 * it carries a random suffix so it cannot be guessed. The file lands in a
 * private bucket that only staff can read.
 */
export default function PaymentProofUpload({
  orderCode,
  alreadyUploaded,
}: {
  orderCode: string;
  alreadyUploaded: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(alreadyUploaded);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    setError(null);

    if (!ACCEPTED.includes(file.type)) {
      setError("Format tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Ukuran berkas melebihi 5 MB.");
      return;
    }

    setBusy(true);
    const res = await uploadPaymentProof(orderCode, file);
    setBusy(false);

    if (!res.ok) {
      setError(res.error ?? "Gagal mengunggah bukti pembayaran.");
      return;
    }
    setDone(true);
  };

  if (done) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        <span>
          Bukti pembayaran sudah diterima. Kasir akan memeriksa dan
          mengonfirmasi lewat WhatsApp.
        </span>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
      <div className="mb-2 text-xs font-medium text-gray-700">
        Unggah bukti transfer
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-lg border border-emerald-600 px-4 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-50 disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Upload className="h-3.5 w-3.5" />
        )}
        {busy ? "Mengunggah…" : "Pilih berkas"}
      </button>

      <p className="mt-2 text-[11px] text-gray-400">
        JPG, PNG, WEBP, atau PDF. Maksimal 5 MB. Hanya kasir yang bisa
        melihatnya.
      </p>

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-red-600">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
