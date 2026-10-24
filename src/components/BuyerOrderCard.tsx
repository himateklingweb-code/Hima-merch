"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  Package,
  PackageCheck,
  Timer,
  Trash2,
  Undo2,
  XCircle,
} from "lucide-react";
import { formatPrice } from "@/data/products";
import {
  formatOrderTime,
  hideMyOrder,
  payTimeLeft,
  requestOrderCancel,
  withdrawOrderCancel,
  type PublicOrderReceipt,
} from "@/lib/orders-repo";

type Stage = "menunggu" | "minta_batal" | "dp" | "lunas" | "diterima" | "batal" | "kadaluarsa";

function stageOf(o: PublicOrderReceipt): Stage {
  if (o.order_status === "kadaluarsa") return "kadaluarsa";
  if (o.order_status === "dibatalkan") return "batal";
  if (o.cancel_requested_at) return "minta_batal";
  if (o.received_at) return "diterima";
  if (o.order_status === "terjual" && o.payment_status === "lunas") return "lunas";
  if (o.order_status === "terjual") return "dp";
  return "menunggu";
}

const STAGE: Record<Stage, { label: string; cls: string; icon: typeof Clock }> = {
  menunggu: { label: "Menunggu pembayaran", cls: "bg-amber-50 text-amber-800 ring-amber-200", icon: Clock },
  minta_batal: { label: "Pembatalan diajukan", cls: "bg-red-50 text-red-700 ring-red-200", icon: AlertTriangle },
  dp: { label: "DP diterima", cls: "bg-sky-50 text-sky-800 ring-sky-200", icon: CheckCircle2 },
  lunas: { label: "Lunas · siap diambil", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200", icon: CheckCircle2 },
  diterima: { label: "Selesai · diterima", cls: "bg-gray-900 text-white ring-gray-900", icon: PackageCheck },
  batal: { label: "Dibatalkan", cls: "bg-gray-100 text-gray-600 ring-gray-200", icon: XCircle },
  kadaluarsa: { label: "Batal otomatis", cls: "bg-gray-100 text-gray-600 ring-gray-200", icon: XCircle },
};

/**
 * Kartu pesanan untuk pembeli — dipakai di riwayat Akun dan halaman Cek
 * Pesanan. Aksi (ajukan batal, hapus dari riwayat) hanya tampil bila server
 * mengizinkan lewat `can_request_cancel` / `can_hide`.
 */
export default function BuyerOrderCard({
  order: o,
  onChanged,
  onRemoved,
}: {
  order: PublicOrderReceipt;
  /** Dipanggil setelah aksi berhasil supaya data dimuat ulang. */
  onChanged?: () => void;
  /** Dipanggil setelah pesanan dihapus dari riwayat. */
  onRemoved?: (code: string) => void;
}) {
  const stage = stageOf(o);
  const S = STAGE[stage];
  const [now, setNow] = useState(() => Date.now());
  const [mode, setMode] = useState<"idle" | "cancel" | "hide">("idle");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (stage !== "menunggu") return;
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, [stage]);

  const left = stage === "menunggu" ? payTimeLeft(o.pay_deadline, now) : null;
  const paid = o.amount_paid ?? 0;

  const act = async (fn: () => Promise<{ ok: boolean; error?: string }>, after?: () => void) => {
    setBusy(true);
    setErr(null);
    const res = await fn();
    setBusy(false);
    if (!res.ok) {
      setErr(res.error ?? "Gagal. Coba lagi.");
      return;
    }
    setMode("idle");
    setReason("");
    after?.();
  };

  return (
    <article className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-2 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <div className="font-mono text-sm font-semibold text-gray-900">{o.order_code}</div>
          <div className="mt-0.5 text-xs text-gray-500">{formatOrderTime(o.created_at)}</div>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${S.cls}`}>
          <S.icon className="h-3.5 w-3.5" />
          {S.label}
        </span>
      </header>

      <ul className="divide-y divide-gray-100">
        {(o.items ?? []).map((it, i) => {
          const thumb = (
            <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gray-100 text-gray-300">
              {it.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.image} alt="" loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <Package className="h-5 w-5" />
              )}
            </span>
          );
          return (
            <li key={i} className="flex items-center gap-3 px-4 py-3">
              {it.product_slug ? (
                <Link href={`/merchandise/${it.product_slug}`} aria-label={it.product_name}>
                  {thumb}
                </Link>
              ) : (
                thumb
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-snug text-gray-900 [overflow-wrap:anywhere]">{it.product_name}</div>
                <div className="mt-0.5 text-xs text-gray-500">
                  {it.variant ? `${it.variant} · ` : ""}
                  {it.qty} × {formatPrice(it.unit_price)}
                  {it.stock_type_snapshot === "pre_order" ? " · Pre-order" : ""}
                </div>
              </div>
              <div className="shrink-0 text-sm font-medium tabular-nums text-gray-900">{formatPrice(it.subtotal)}</div>
            </li>
          );
        })}
      </ul>

      <div className="space-y-2 border-t border-gray-100 px-4 py-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-gray-500">Total</span>
          <span className="font-semibold tabular-nums text-gray-900">{formatPrice(o.total_amount)}</span>
        </div>
        {o.payment_status === "dp" && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-500">Sudah dibayar (DP)</span>
            <span className="tabular-nums text-gray-700">
              {formatPrice(paid)} · sisa {formatPrice(Math.max(0, o.total_amount - paid))}
            </span>
          </div>
        )}

        {left && (
          <div className="flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
            <Timer className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Bayar dalam <span className="font-semibold">{left}</span> (sebelum {formatOrderTime(o.pay_deadline)}). Lewat dari
              itu pesanan dibatalkan otomatis dan stok dilepas.
            </span>
          </div>
        )}
        {stage === "minta_batal" && (
          <div className="rounded-lg bg-red-50 p-2.5 text-xs text-red-800">
            Pengajuan pembatalan dikirim {formatOrderTime(o.cancel_requested_at)}. Menunggu keputusan pengurus.
          </div>
        )}
        {o.cancel_reject_note && stage !== "batal" && stage !== "kadaluarsa" && (
          <div className="rounded-lg bg-gray-50 p-2.5 text-xs text-gray-700">
            Pengajuan batal ditolak: {o.cancel_reject_note}
          </div>
        )}
        {o.verified_at && stage !== "batal" && stage !== "kadaluarsa" && (
          <div className="text-xs text-gray-500">Pembayaran dikonfirmasi {formatOrderTime(o.verified_at)}</div>
        )}
        {o.received_at && <div className="text-xs text-gray-500">Barang diterima {formatOrderTime(o.received_at)}</div>}
        {(stage === "batal" || stage === "kadaluarsa") && (
          <div className="text-xs text-gray-500">
            {o.cancel_reason ?? "Pesanan dibatalkan."}
            {o.cancelled_at && <> · {formatOrderTime(o.cancelled_at)}</>}
          </div>
        )}
        {stage === "lunas" && (
          <div className="text-xs text-gray-500">Pesanan lunas tidak dapat dibatalkan.</div>
        )}

        {err && (
          <p role="alert" className="rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
            {err}
          </p>
        )}

        {mode === "cancel" && (
          <div className="rounded-lg border border-gray-200 p-3">
            <label className="block text-xs font-medium text-gray-700">
              Alasan pembatalan (opsional)
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                maxLength={300}
                rows={2}
                autoFocus
                placeholder="mis. salah pilih ukuran"
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:text-sm"
              />
            </label>
            <p className="mt-1 text-[11px] text-gray-500">Pengurus akan meninjau dan memutuskan pengajuanmu.</p>
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button onClick={() => setMode("idle")} disabled={busy} className="min-h-10 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100">
                Kembali
              </button>
              <button
                onClick={() => act(() => requestOrderCancel(o.order_code, reason), onChanged)}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Kirim pengajuan
              </button>
            </div>
          </div>
        )}

        {mode === "hide" && (
          <div className="rounded-lg border border-gray-200 p-3 text-xs text-gray-600">
            Hapus pesanan ini dari riwayatmu? Pesanan tidak bisa dikembalikan ke daftar.
            <div className="mt-2 flex flex-wrap justify-end gap-2">
              <button onClick={() => setMode("idle")} disabled={busy} className="min-h-10 rounded-lg px-3 text-sm text-gray-600 hover:bg-gray-100">
                Kembali
              </button>
              <button
                onClick={() => act(() => hideMyOrder(o.order_code), () => onRemoved?.(o.order_code))}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-gray-900 px-3 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-60"
              >
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus dari riwayat
              </button>
            </div>
          </div>
        )}

        {mode === "idle" && (o.can_request_cancel || stage === "minta_batal" || o.can_hide) && (
          <div className="flex flex-wrap justify-end gap-2 pt-1">
            {o.can_request_cancel && (
              <button
                onClick={() => setMode("cancel")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-red-700 hover:border-red-200 hover:bg-red-50"
              >
                <XCircle className="h-4 w-4" /> Ajukan pembatalan
              </button>
            )}
            {stage === "minta_batal" && (
              <button
                onClick={() => act(() => withdrawOrderCancel(o.order_code), onChanged)}
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                Tarik pengajuan
              </button>
            )}
            {o.can_hide && (
              <button
                onClick={() => setMode("hide")}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Trash2 className="h-4 w-4" /> Hapus dari riwayat
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}
