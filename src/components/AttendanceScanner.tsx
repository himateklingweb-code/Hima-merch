"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  MapPin,
  RefreshCw,
  X,
} from "lucide-react";
import { QR_PREFIX, checkIn } from "@/lib/attendance-repo";

type Phase =
  | "starting"
  | "scanning"
  | "locating"
  | "sending"
  | "done"
  | "error";

interface Result {
  title: string;
  checkedAt: string;
  already: boolean;
  distance: number | null;
}

/** BarcodeDetector bawaan Chrome/Android (lebih cepat). Belum ada di tipe TS. */
interface NativeDetector {
  detect: (src: CanvasImageSource) => Promise<{ rawValue: string }[]>;
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts: { formats: string[] }) => NativeDetector;
  }
}

function cameraErrorText(err: unknown): string {
  const name = (err as { name?: string })?.name ?? "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Izin kamera ditolak. Buka pengaturan situs di browser, izinkan Kamera, lalu coba lagi.";
  if (name === "NotFoundError" || name === "OverconstrainedError")
    return "Kamera tidak ditemukan di perangkat ini.";
  if (name === "NotReadableError")
    return "Kamera sedang dipakai aplikasi lain. Tutup aplikasi itu lalu coba lagi.";
  return "Kamera tidak bisa dibuka. Pastikan situs dibuka lewat https.";
}

function locationErrorText(err: GeolocationPositionError): string {
  if (err.code === err.PERMISSION_DENIED)
    return "Izin lokasi ditolak. Izinkan Lokasi untuk situs ini, nyalakan GPS, lalu scan lagi.";
  if (err.code === err.TIMEOUT)
    return "Lokasi terlalu lama didapat. Nyalakan GPS / pindah ke area terbuka, lalu scan lagi.";
  return "Lokasi tidak tersedia. Nyalakan GPS lalu scan lagi.";
}

/** Minta lokasi terbaik dalam beberapa detik (GPS butuh waktu untuk akurat). */
function getPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject({ code: 2, PERMISSION_DENIED: 1, TIMEOUT: 3 } as GeolocationPositionError);
      return;
    }
    let best: GeolocationPosition | null = null;
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      navigator.geolocation.clearWatch(watchId);
      clearTimeout(timer);
      fn();
    };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!best || pos.coords.accuracy < best.coords.accuracy) best = pos;
        // Cukup akurat untuk radius 15 m: kirim sekarang.
        if (pos.coords.accuracy <= 10) finish(() => resolve(pos));
      },
      (err) => {
        if (best) finish(() => resolve(best as GeolocationPosition));
        else finish(() => reject(err));
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    // Setelah 8 detik, pakai bacaan terbaik yang sudah ada.
    const timer = setTimeout(() => {
      if (best) finish(() => resolve(best as GeolocationPosition));
    }, 8000);
  });
}

/**
 * Layar penuh: buka kamera, baca QR absensi, ambil lokasi, kirim ke server.
 * Server yang memutuskan apakah lokasi dibutuhkan dan apakah masih di radius;
 * lokasi diminta setiap kali supaya satu kali scan cukup.
 */
export default function AttendanceScanner({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const busyRef = useRef(false);

  const [phase, setPhase] = useState<Phase>("starting");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [attempt, setAttempt] = useState(0);

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const submit = useCallback(
    async (payload: string) => {
      stopCamera();
      setPhase("locating");

      let coords: { latitude: number; longitude: number; accuracy: number } | null =
        null;
      let locError: string | null = null;
      try {
        const pos = await getPosition();
        coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
      } catch (e) {
        locError = locationErrorText(e as GeolocationPositionError);
      }

      setPhase("sending");
      const r = await checkIn(payload, coords);
      if (r.ok) {
        setResult({
          title: r.sessionTitle ?? "Absensi",
          checkedAt: r.checkedAt ?? new Date().toISOString(),
          already: Boolean(r.already),
          distance: r.distance ?? null,
        });
        setPhase("done");
        onSuccess?.();
        return;
      }
      // Bila server minta lokasi dan lokasi gagal, tampilkan alasan lokasinya.
      const needsLocation = /lokasi|koordinat/i.test(r.error ?? "");
      setError(needsLocation && locError ? locError : r.error ?? "Absensi gagal.");
      setPhase("error");
    },
    [onSuccess, stopCamera]
  );

  useEffect(() => {
    let cancelled = false;
    busyRef.current = false;

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Browser ini tidak mendukung kamera. Pakai Chrome atau Safari terbaru.");
        setPhase("error");
        return;
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (e) {
        if (!cancelled) {
          setError(cameraErrorText(e));
          setPhase("error");
        }
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      try {
        await video.play();
      } catch {
        // Autoplay ditolak: video tetap jalan setelah ada interaksi.
      }
      setPhase("scanning");

      const native =
        typeof window.BarcodeDetector === "function"
          ? new window.BarcodeDetector({ formats: ["qr_code"] })
          : null;
      const jsQR = native ? null : (await import("jsqr")).default;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      let last = 0;

      const tick = async (t: number) => {
        if (cancelled || !streamRef.current) return;
        rafRef.current = requestAnimationFrame(tick);
        // ±8 kali per detik sudah cukup dan hemat baterai.
        if (t - last < 120 || busyRef.current) return;
        last = t;
        if (video.readyState < 2 || !video.videoWidth) return;

        let text: string | null = null;
        try {
          if (native) {
            const codes = await native.detect(video);
            text = codes[0]?.rawValue ?? null;
          } else if (jsQR && ctx) {
            // Perkecil frame supaya decode cepat di HP murah.
            const scale = Math.min(1, 640 / video.videoWidth);
            const w = Math.round(video.videoWidth * scale);
            const h = Math.round(video.videoHeight * scale);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);
            const img = ctx.getImageData(0, 0, w, h);
            text = jsQR(img.data, w, h, { inversionAttempts: "dontInvert" })?.data ?? null;
          }
        } catch {
          return;
        }

        if (text && text.startsWith(QR_PREFIX) && !busyRef.current) {
          busyRef.current = true;
          if ("vibrate" in navigator) navigator.vibrate?.(60);
          void submit(text.trim());
        }
      };
      rafRef.current = requestAnimationFrame(tick);
    })();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [attempt, stopCamera, submit]);

  // Tutup dengan Escape, kunci scroll halaman di belakang.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const retry = () => {
    setError(null);
    setResult(null);
    setPhase("starting");
    setAttempt((a) => a + 1);
  };

  const showCamera = phase === "starting" || phase === "scanning";

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black"
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR absensi"
    >
      <div className="flex items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] text-white">
        <div>
          <div className="text-sm font-semibold">Scan QR Absensi</div>
          <div className="text-xs text-white/70">
            Arahkan kamera ke QR yang ditampilkan pengurus
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 hover:bg-white/20"
          aria-label="Tutup scanner"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`h-full w-full object-cover ${showCamera ? "" : "hidden"}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {showCamera && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative aspect-square w-[70vw] max-w-72 rounded-3xl shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]">
              <span className="absolute -left-0.5 -top-0.5 h-8 w-8 rounded-tl-3xl border-l-4 border-t-4 border-white" />
              <span className="absolute -right-0.5 -top-0.5 h-8 w-8 rounded-tr-3xl border-r-4 border-t-4 border-white" />
              <span className="absolute -bottom-0.5 -left-0.5 h-8 w-8 rounded-bl-3xl border-b-4 border-l-4 border-white" />
              <span className="absolute -bottom-0.5 -right-0.5 h-8 w-8 rounded-br-3xl border-b-4 border-r-4 border-white" />
            </div>
          </div>
        )}

        {phase === "starting" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white">
            <Camera className="h-8 w-8 animate-pulse" />
            <p className="px-8 text-center text-sm text-white/80">
              Membuka kamera… Pilih <strong>Izinkan</strong> bila browser bertanya.
            </p>
          </div>
        )}

        {(phase === "locating" || phase === "sending") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-8 text-center text-white">
            {phase === "locating" ? (
              <MapPin className="h-9 w-9 animate-pulse" />
            ) : (
              <Loader2 className="h-9 w-9 animate-spin" />
            )}
            <p className="text-base font-semibold">
              {phase === "locating" ? "Mengambil lokasimu…" : "Mencatat kehadiran…"}
            </p>
            <p className="text-sm text-white/70">
              {phase === "locating"
                ? "Izinkan akses lokasi bila diminta. Tetap di tempat sampai selesai."
                : "Sebentar lagi."}
            </p>
          </div>
        )}

        {phase === "done" && result && (
          <div className="absolute inset-0 flex items-center justify-center bg-white p-6">
            <div className="max-w-sm text-center">
              <CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600" />
              <h2 className="mt-3 text-xl font-bold text-gray-900">
                {result.already ? "Kamu sudah absen" : "Absensi tercatat"}
              </h2>
              <p className="mt-1 font-medium text-gray-700">{result.title}</p>
              <p className="mt-1 text-sm text-gray-500">
                {new Date(result.checkedAt).toLocaleString("id-ID", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {result.distance != null && ` · ${result.distance} m dari titik absen`}
              </p>
              <button
                onClick={onClose}
                className="mt-6 w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                Selesai
              </button>
            </div>
          </div>
        )}

        {phase === "error" && (
          <div className="absolute inset-0 flex items-center justify-center bg-white p-6">
            <div className="max-w-sm text-center">
              <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
              <h2 className="mt-3 text-lg font-bold text-gray-900">
                Absensi belum berhasil
              </h2>
              <p className="mt-2 text-sm text-gray-600">{error}</p>
              <div className="mt-6 flex gap-2">
                <button
                  onClick={onClose}
                  className="flex-1 rounded-lg border border-gray-200 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Tutup
                </button>
                <button
                  onClick={retry}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  <RefreshCw className="h-4 w-4" />
                  Scan lagi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
