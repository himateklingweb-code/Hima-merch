"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Loader2, Maximize2, RefreshCw, X } from "lucide-react";
import { fetchQrPayload } from "@/lib/attendance-repo";

/**
 * QR absensi untuk ditampilkan di layar/proyektor. Mode berganti: QR diambil
 * ulang dari server setiap 30 detik, jadi foto QR yang dibagikan ke grup
 * cepat kedaluwarsa. Mode statis: QR tetap dan bisa diunduh untuk dicetak.
 */
export default function AttendanceQr({
  sessionId,
  title,
  rotate,
}: {
  sessionId: string;
  title: string;
  rotate: boolean;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [fullscreen, setFullscreen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Versi terbaru `load` untuk timer (fungsi tidak bisa memanggil dirinya
  // sendiri lewat closure useCallback).
  const loadRef = useRef<() => Promise<void>>(async () => {});

  const load = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    const r = await fetchQrPayload(sessionId);
    if (!r.payload) {
      setError(r.error ?? "QR tidak bisa dibuat.");
      // Coba lagi sebentar lagi (mis. koneksi putus sesaat).
      timer.current = setTimeout(() => void loadRef.current(), 5000);
      return;
    }
    setError(null);
    setDataUrl(
      await QRCode.toDataURL(r.payload, {
        width: 720,
        margin: 2,
        errorCorrectionLevel: "M",
      })
    );
    if (r.rotate && r.expiresIn != null) {
      setExpiresAt(Date.now() + r.expiresIn * 1000);
      // Ambil QR baru tepat setelah jendela 30 detik berganti.
      timer.current = setTimeout(
        () => void loadRef.current(),
        r.expiresIn * 1000 + 300
      );
    } else {
      setExpiresAt(null);
    }
  }, [sessionId]);

  useEffect(() => {
    loadRef.current = load;
    // Promise.resolve: setState tidak dipanggil langsung di dalam effect.
    void Promise.resolve().then(load);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  // Detak 1 detik untuk hitung mundur (hanya mode berganti).
  useEffect(() => {
    if (!rotate) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [rotate]);

  const secondsLeft =
    expiresAt == null ? null : Math.max(0, Math.ceil((expiresAt - now) / 1000));

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFullscreen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fullscreen]);

  const qr = dataUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={dataUrl}
      alt={`QR absensi ${title}`}
      className="h-full w-full rounded-lg bg-white [image-rendering:pixelated]"
    />
  ) : (
    <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-50">
      <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
    </div>
  );

  const caption = rotate
    ? secondsLeft != null
      ? `QR berganti dalam ${secondsLeft} detik`
      : "QR berganti tiap 30 detik"
    : "QR statis, bisa dicetak";

  return (
    <div>
      <div className="mx-auto aspect-square w-full max-w-64">{qr}</div>
      <p className="mt-2 text-center text-xs text-gray-500">{caption}</p>
      {error && <p className="mt-1 text-center text-xs text-red-600">{error}</p>}

      <div className="mt-3 flex flex-wrap justify-center gap-2">
        <button
          onClick={() => setFullscreen(true)}
          disabled={!dataUrl}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Maximize2 className="h-3.5 w-3.5" />
          Layar penuh
        </button>
        {!rotate && dataUrl && (
          <a
            href={dataUrl}
            download={`qr-absensi-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Unduh PNG
          </a>
        )}
        <button
          onClick={() => void load()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Muat ulang
        </button>
      </div>

      {fullscreen && (
        <div
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white p-6"
          role="dialog"
          aria-modal="true"
          aria-label="QR absensi layar penuh"
        >
          <button
            onClick={() => setFullscreen(false)}
            className="absolute right-4 top-4 rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
            aria-label="Tutup layar penuh"
          >
            <X className="h-6 w-6" />
          </button>
          <h2 className="mb-1 text-center text-2xl font-bold text-gray-900 sm:text-4xl">
            {title}
          </h2>
          <p className="mb-6 text-center text-sm text-gray-500 sm:text-lg">
            Buka hmtl → Akun → Absensi, lalu scan QR ini
          </p>
          <div className="aspect-square w-full max-w-[min(80vh,80vw)]">{qr}</div>
          <p className="mt-4 text-center text-base font-medium text-gray-700 sm:text-xl">
            {caption}
          </p>
        </div>
      )}
    </div>
  );
}
