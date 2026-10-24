"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileDown,
  ListChecks,
  Loader2,
  MessageCircle,
  Package,
  PackageCheck,
  Receipt,
  RotateCcw,
  ShieldOff,
  StickyNote,
  Timer,
  Trash2,
  Undo2,
  Users,
  Wallet,
  X,
  XCircle,
} from "lucide-react";
import type { PaymentStatus } from "@/data/orders";
import { formatPrice } from "@/data/products";
import {
  adminOrderAction,
  fetchBans,
  fetchOrders,
  formatOrderTime,
  payTimeLeft,
  purgeCancelledOrders,
  signedProofUrl,
  unban,
  type AdminOrderAction,
  type BanRecord,
  type OrderItemRecord,
  type OrderRecord,
} from "@/lib/orders-repo";
import { useAuth } from "@/components/AuthContext";
import AdminSearch from "@/components/admin/AdminSearch";
import DbStatus from "@/components/admin/DbStatus";
import { matchesQuery } from "@/lib/search";

// ------------------------------------------------------------------ status

type Stage =
  | "menunggu"
  | "minta_batal"
  | "dp"
  | "lunas"
  | "diterima"
  | "batal";

/** Satu label tahap yang dibaca manusia, diturunkan dari kolom-kolom pesanan. */
function stageOf(o: OrderRecord): Stage {
  if (o.order_status === "dibatalkan" || o.order_status === "kadaluarsa") return "batal";
  if (o.cancel_requested_at) return "minta_batal";
  if (o.received_at) return "diterima";
  if (o.order_status === "terjual" && o.payment_status === "lunas") return "lunas";
  if (o.order_status === "terjual") return "dp";
  return "menunggu";
}

const STAGE: Record<Stage, { label: string; cls: string }> = {
  menunggu: { label: "Menunggu bayar", cls: "bg-amber-50 text-amber-800 ring-amber-200" },
  minta_batal: { label: "Minta batal", cls: "bg-red-50 text-red-700 ring-red-200" },
  dp: { label: "DP", cls: "bg-sky-50 text-sky-800 ring-sky-200" },
  lunas: { label: "Lunas", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  diterima: { label: "Diterima", cls: "bg-gray-900 text-white ring-gray-900" },
  batal: { label: "Batal", cls: "bg-gray-100 text-gray-500 ring-gray-200" },
};

const STAGE_ORDER: Stage[] = ["menunggu", "minta_batal", "dp", "lunas", "diterima", "batal"];

const PAY_LABEL: Record<PaymentStatus, string> = {
  belum_lunas: "Belum bayar",
  dp: "DP",
  lunas: "Lunas",
};

function StageBadge({ stage }: { stage: Stage }) {
  const s = STAGE[stage];
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset ${s.cls}`}>
      {s.label}
    </span>
  );
}

function Thumb({ src, size = "h-12 w-12" }: { src?: string | null; size?: string }) {
  return (
    <span className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-lg bg-gray-100 text-gray-300`}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <Package className="h-5 w-5" />
      )}
    </span>
  );
}

// ------------------------------------------------------------------ dialog

type Dialog =
  | { kind: "dp"; order: OrderRecord }
  | { kind: "cancel"; order: OrderRecord }
  | { kind: "reject"; order: OrderRecord }
  | { kind: "note"; order: OrderRecord }
  | { kind: "delete"; order: OrderRecord }
  | { kind: "purge"; count: number };

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
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

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            aria-label="Tutup"
            className="grid h-10 w-10 place-items-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ halaman

type Tab = "pesanan" | "item" | "blokir";

export default function AdminPesananPage() {
  const { profile } = useAuth();
  const isAdmin = profile?.staff_role === "admin";

  const [tab, setTab] = useState<Tab>("pesanan");
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const reload = useCallback(async () => {
    const res = await fetchOrders();
    setOrders(res.orders);
    setLive(res.live);
    setLoadError(res.error ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchOrders().then((res) => {
      if (!alive) return;
      setOrders(res.orders);
      setLive(res.live);
      setLoadError(res.error ?? null);
      setLoading(false);
    });
    // Sisa waktu bayar diperbarui tiap menit tanpa memuat ulang data.
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 5000);
    return () => clearTimeout(t);
  }, [notice]);

  const run = async (
    order: OrderRecord,
    action: AdminOrderAction,
    opts: { note?: string | null; amount?: number | null } = {},
    okText?: string
  ) => {
    setBusy(order.order_code);
    setNotice(null);
    const res = await adminOrderAction(order.order_code, action, opts);
    setBusy(null);
    if (!res.ok) {
      setNotice({ type: "err", text: res.error ?? "Aksi gagal." });
      return false;
    }
    setDialog(null);
    if (okText) setNotice({ type: "ok", text: okText });
    await reload();
    return true;
  };

  const viewProof = async (path: string) => {
    const url = await signedProofUrl(path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else setNotice({ type: "err", text: "Bukti pembayaran tidak dapat dibuka." });
  };

  const cancelledCount = orders.filter((o) => stageOf(o) === "batal").length;
  const cancelRequests = orders.filter((o) => stageOf(o) === "minta_batal").length;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pesanan</h1>
          <p className="mt-1 text-sm text-gray-500">
            Konfirmasi pembayaran, tandai barang diterima, dan tangani pembatalan.
          </p>
        </div>
        <DbStatus live={live} loading={loading} error={loadError} />
      </div>

      <div
        className="mb-5 flex gap-1 overflow-x-auto rounded-lg border border-gray-200 bg-white p-1 sm:inline-flex"
        role="tablist"
        aria-label="Bagian pesanan"
      >
        {(
          [
            { v: "pesanan", t: "Pesanan", icon: Receipt, badge: cancelRequests },
            { v: "item", t: "Rekap per item", icon: ListChecks, badge: 0 },
            ...(isAdmin ? [{ v: "blokir" as const, t: "Blokir spam", icon: ShieldOff, badge: 0 }] : []),
          ] as { v: Tab; t: string; icon: typeof Receipt; badge: number }[]
        ).map((o) => (
          <button
            key={o.v}
            role="tab"
            aria-selected={tab === o.v}
            onClick={() => setTab(o.v)}
            className={`inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors ${
              tab === o.v ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <o.icon className="h-4 w-4" />
            {o.t}
            {o.badge > 0 && (
              <span className="rounded-full bg-red-600 px-1.5 text-[11px] leading-5 text-white">{o.badge}</span>
            )}
          </button>
        ))}
      </div>

      {notice && (
        <div
          role={notice.type === "err" ? "alert" : "status"}
          className={`mb-4 flex items-start gap-2 rounded-lg border p-3 text-sm ${
            notice.type === "err"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-emerald-200 bg-emerald-50 text-emerald-800"
          }`}
        >
          {notice.type === "err" ? (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          <span className="flex-1">{notice.text}</span>
          <button onClick={() => setNotice(null)} aria-label="Tutup" className="opacity-60 hover:opacity-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {tab === "pesanan" && (
        <OrdersTab
          orders={orders}
          loading={loading}
          busy={busy}
          now={now}
          cancelledCount={cancelledCount}
          onRun={run}
          onDialog={setDialog}
          onProof={viewProof}
        />
      )}
      {tab === "item" && <ItemsTab orders={orders} loading={loading} />}
      {tab === "blokir" && isAdmin && <BansTab />}

      {dialog && (
        <ActionDialog
          dialog={dialog}
          busy={busy !== null}
          onClose={() => setDialog(null)}
          onRun={run}
          onPurge={async () => {
            setBusy("purge");
            const res = await purgeCancelledOrders();
            setBusy(null);
            if (!res.ok) {
              setNotice({ type: "err", text: res.error ?? "Gagal menghapus." });
              return;
            }
            setDialog(null);
            setNotice({ type: "ok", text: `${res.count ?? 0} pesanan batal dihapus permanen.` });
            await reload();
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------- tab pesanan

function OrdersTab({
  orders,
  loading,
  busy,
  now,
  cancelledCount,
  onRun,
  onDialog,
  onProof,
}: {
  orders: OrderRecord[];
  loading: boolean;
  busy: string | null;
  now: number;
  cancelledCount: number;
  onRun: (o: OrderRecord, a: AdminOrderAction, opts?: { note?: string | null; amount?: number | null }, ok?: string) => Promise<boolean>;
  onDialog: (d: Dialog) => void;
  onProof: (path: string) => void;
}) {
  const [stage, setStage] = useState<Stage | "all">("all");
  const [q, setQ] = useState("");

  const counts = useMemo(() => {
    const c = Object.fromEntries(STAGE_ORDER.map((s) => [s, 0])) as Record<Stage, number>;
    orders.forEach((o) => (c[stageOf(o)] += 1));
    return c;
  }, [orders]);

  const shown = useMemo(
    () =>
      orders.filter(
        (o) =>
          (stage === "all" || stageOf(o) === stage) &&
          matchesQuery(
            q,
            o.order_code,
            o.buyer_name,
            o.buyer_wa,
            o.buyer_email,
            o.buyer_nim,
            o.buyer_prodi,
            ...(o.items ?? []).map((i) => `${i.product_name} ${i.variant ?? ""}`)
          )
      ),
    [orders, stage, q]
  );

  const money = useMemo(() => {
    let masuk = 0;
    let piutang = 0;
    orders.forEach((o) => {
      if (o.order_status !== "terjual") return;
      const paid = o.amount_paid ?? (o.payment_status === "lunas" ? o.total_amount : 0);
      masuk += paid;
      piutang += Math.max(0, o.total_amount - paid);
    });
    return { masuk, piutang };
  }, [orders]);

  return (
    <>
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Menunggu bayar", value: String(counts.menunggu), warn: counts.menunggu > 0 },
          { label: "Minta dibatalkan", value: String(counts.minta_batal), warn: counts.minta_batal > 0 },
          { label: "Uang masuk", value: formatPrice(money.masuk) },
          { label: "Sisa tagihan DP", value: formatPrice(money.piutang) },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className={`mt-0.5 text-lg font-bold tabular-nums ${s.warn ? "text-amber-700" : "text-gray-900"}`}>
              {loading ? "–" : s.value}
            </div>
          </div>
        ))}
      </div>

      <AdminSearch
        value={q}
        onChange={setQ}
        placeholder="Cari kode, nama, WA, email, produk…"
        total={orders.length}
        shown={shown.length}
      >
        {cancelledCount > 0 && (
          <button
            onClick={() => onDialog({ kind: "purge", count: cancelledCount })}
            className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-600 hover:border-red-200 hover:text-red-700 sm:ml-auto"
          >
            <Trash2 className="h-4 w-4" />
            Hapus semua yang batal ({cancelledCount})
          </button>
        )}
      </AdminSearch>

      <div className="-mt-1 mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Saring tahap">
        {(["all", ...STAGE_ORDER] as const).map((s) => {
          const n = s === "all" ? orders.length : counts[s];
          return (
            <button
              key={s}
              role="tab"
              aria-selected={stage === s}
              onClick={() => setStage(s)}
              className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
                stage === s
                  ? "border-emerald-600 bg-emerald-600 text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
              }`}
            >
              {s === "all" ? "Semua" : STAGE[s].label}
              <span className={stage === s ? "text-emerald-100" : "text-gray-400"}>{n}</span>
            </button>
          );
        })}
      </div>

      {loading && (
        <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-400">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
          Memuat pesanan…
        </div>
      )}

      {!loading && shown.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center text-sm text-gray-500">
          {orders.length === 0 ? "Belum ada pesanan." : "Tidak ada pesanan yang cocok."}
        </div>
      )}

      <ul className="grid gap-3">
        {shown.map((o) => (
          <OrderCard
            key={o.id}
            order={o}
            busy={busy === o.order_code}
            now={now}
            onRun={onRun}
            onDialog={onDialog}
            onProof={onProof}
          />
        ))}
      </ul>
    </>
  );
}

function Btn({
  children,
  onClick,
  tone = "neutral",
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  tone?: "primary" | "neutral" | "danger";
  disabled?: boolean;
  title?: string;
}) {
  const cls =
    tone === "primary"
      ? "bg-emerald-600 text-white hover:bg-emerald-700 border-emerald-600"
      : tone === "danger"
        ? "border-gray-200 bg-white text-red-700 hover:border-red-200 hover:bg-red-50"
        : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors disabled:opacity-60 ${cls}`}
    >
      {children}
    </button>
  );
}

function OrderCard({
  order: o,
  busy,
  now,
  onRun,
  onDialog,
  onProof,
}: {
  order: OrderRecord;
  busy: boolean;
  now: number;
  onRun: (o: OrderRecord, a: AdminOrderAction, opts?: { note?: string | null; amount?: number | null }, ok?: string) => Promise<boolean>;
  onDialog: (d: Dialog) => void;
  onProof: (path: string) => void;
}) {
  const stage = stageOf(o);
  const items = o.items ?? [];
  const paid = o.amount_paid ?? 0;
  const left = stage === "menunggu" ? payTimeLeft(o.pay_deadline, now) : null;
  const active = o.order_status === "pending_verifikasi" || o.order_status === "terjual";

  return (
    <li className={`rounded-xl border bg-white ${stage === "minta_batal" ? "border-red-200" : "border-gray-200"}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-gray-100 px-4 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-sm font-semibold text-gray-900">{o.order_code}</span>
            <StageBadge stage={stage} />
            {o.order_status === "kadaluarsa" && (
              <span className="text-[11px] text-gray-400">otomatis (lewat 24 jam)</span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-gray-500">Dipesan {formatOrderTime(o.created_at)}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold tabular-nums text-gray-900">{formatPrice(o.total_amount)}</div>
          <div className="text-xs text-gray-500">
            {o.payment_status === "dp"
              ? `DP ${formatPrice(paid)} · sisa ${formatPrice(Math.max(0, o.total_amount - paid))}`
              : PAY_LABEL[o.payment_status]}
          </div>
        </div>
      </div>

      <div className="grid gap-4 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="min-w-0 text-sm">
          <div className="font-medium text-gray-900 [overflow-wrap:anywhere]">{o.buyer_name}</div>
          <div className="text-gray-500">
            <a href={`https://wa.me/${o.buyer_wa}`} target="_blank" rel="noopener noreferrer" className="hover:text-emerald-700 hover:underline">
              {o.buyer_wa}
            </a>
            {o.buyer_nim && <> · {o.buyer_nim}</>}
            {o.buyer_prodi && <> · {o.buyer_prodi}</>}
          </div>
          {o.buyer_email && <div className="truncate text-xs text-gray-500">{o.buyer_email}</div>}
          {o.buyer_address && o.buyer_address !== "—" && (
            <div className="mt-1 text-xs text-gray-500 [overflow-wrap:anywhere]">{o.buyer_address}</div>
          )}
          {o.notes && (
            <div className="mt-2 rounded-md bg-gray-50 px-2 py-1.5 text-xs text-gray-600">
              <span className="font-medium">Catatan pembeli:</span> {o.notes}
            </div>
          )}
        </div>

        <ul className="grid gap-2">
          {items.map((it, i) => (
            <li key={i} className="flex items-center gap-3">
              <Thumb src={it.image} />
              <div className="min-w-0 flex-1 text-sm">
                <div className="font-medium leading-snug text-gray-900 [overflow-wrap:anywhere]">{it.product_name}</div>
                <div className="text-xs text-gray-500">
                  {it.variant ? `${it.variant} · ` : ""}
                  {it.qty} × {formatPrice(it.unit_price)}
                  {it.stock_type_snapshot === "pre_order" && " · PO"}
                </div>
              </div>
              <div className="text-sm tabular-nums text-gray-700">{formatPrice(it.subtotal)}</div>
            </li>
          ))}
        </ul>
      </div>

      {/* Info status */}
      <div className="space-y-2 px-4 pb-3 text-xs">
        {left && (
          <div className="flex items-center gap-1.5 text-amber-800">
            <Timer className="h-3.5 w-3.5" />
            Batal otomatis dalam {left} ({formatOrderTime(o.pay_deadline)}) bila belum dibayar.
          </div>
        )}
        {o.cancel_requested_at && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-800">
            <div className="font-medium">Pembeli minta pesanan dibatalkan · {formatOrderTime(o.cancel_requested_at)}</div>
            {o.cancel_request_reason && <div className="mt-0.5">Alasan: {o.cancel_request_reason}</div>}
          </div>
        )}
        {o.verified_at && (
          <div className="text-gray-500">
            Pembayaran dikonfirmasi {o.verified_by ? `oleh ${o.verified_by} ` : ""}· {formatOrderTime(o.verified_at)}
          </div>
        )}
        {o.received_at && (
          <div className="text-gray-500">
            Barang diterima {o.received_by ? `(dicatat ${o.received_by}) ` : ""}· {formatOrderTime(o.received_at)}
          </div>
        )}
        {o.cancelled_at && (
          <div className="text-gray-500">
            Dibatalkan {o.cancelled_by ? `oleh ${o.cancelled_by} ` : ""}· {formatOrderTime(o.cancelled_at)}
            {o.cancel_reason && <> — {o.cancel_reason}</>}
          </div>
        )}
        {o.admin_note && (
          <div className="flex gap-1.5 rounded-md bg-amber-50 px-2 py-1.5 text-amber-900">
            <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="[overflow-wrap:anywhere]">{o.admin_note}</span>
          </div>
        )}
      </div>

      {/* Aksi */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 px-4 py-3">
        {busy && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}

        {stage === "minta_batal" && (
          <>
            <Btn tone="danger" disabled={busy} onClick={() => onDialog({ kind: "cancel", order: o })}>
              <XCircle className="h-4 w-4" /> Setujui pembatalan
            </Btn>
            <Btn disabled={busy} onClick={() => onDialog({ kind: "reject", order: o })}>
              Tolak pengajuan
            </Btn>
          </>
        )}

        {active && o.payment_status !== "lunas" && (
          <Btn tone="primary" disabled={busy} onClick={() => onRun(o, "confirm_paid", {}, `${o.order_code} ditandai lunas.`)}>
            <CheckCircle2 className="h-4 w-4" /> Lunas
          </Btn>
        )}
        {active && o.payment_status !== "lunas" && (
          <Btn disabled={busy} onClick={() => onDialog({ kind: "dp", order: o })}>
            <Wallet className="h-4 w-4" /> {o.payment_status === "dp" ? "Ubah DP" : "Catat DP"}
          </Btn>
        )}
        {o.order_status === "terjual" && !o.received_at && (
          <Btn disabled={busy} onClick={() => onRun(o, "received", {}, `${o.order_code}: barang diterima.`)}>
            <PackageCheck className="h-4 w-4" /> Barang diterima
          </Btn>
        )}
        {o.received_at && (
          <Btn disabled={busy} onClick={() => onRun(o, "unreceived", {}, "Tanda diterima dibatalkan.")}>
            <Undo2 className="h-4 w-4" /> Belum diterima
          </Btn>
        )}
        {stage === "menunggu" && (
          <Btn disabled={busy} title="Tambah 24 jam ke batas bayar" onClick={() => onRun(o, "extend", {}, "Batas bayar diperpanjang 24 jam.")}>
            <Clock className="h-4 w-4" /> +24 jam
          </Btn>
        )}
        {o.order_status === "terjual" && o.payment_status === "lunas" && !o.received_at && (
          <Btn disabled={busy} title="Koreksi: dana dikembalikan / salah konfirmasi" onClick={() => onRun(o, "mark_unpaid", {}, "Status bayar dikembalikan ke belum bayar.")}>
            <RotateCcw className="h-4 w-4" /> Batalkan lunas
          </Btn>
        )}
        {o.order_status === "terjual" && o.payment_status !== "lunas" && !o.received_at && (
          <Btn disabled={busy} title="Kembali ke menunggu bayar" onClick={() => onRun(o, "undo_confirm", {}, "Konfirmasi diurungkan.")}>
            <Undo2 className="h-4 w-4" /> Urungkan
          </Btn>
        )}
        {active && stage !== "minta_batal" && o.payment_status !== "lunas" && !o.received_at && (
          <Btn tone="danger" disabled={busy} onClick={() => onDialog({ kind: "cancel", order: o })}>
            <XCircle className="h-4 w-4" /> Batalkan
          </Btn>
        )}
        {stage === "batal" && (
          <Btn tone="danger" disabled={busy} onClick={() => onDialog({ kind: "delete", order: o })}>
            <Trash2 className="h-4 w-4" /> Hapus permanen
          </Btn>
        )}

        <div className="ml-auto flex items-center gap-1">
          {o.payment_proof_url && (
            <IconLink label="Lihat bukti bayar" onClick={() => onProof(o.payment_proof_url!)}>
              <Receipt className="h-4 w-4" />
            </IconLink>
          )}
          <IconLink label="Catatan pengurus" onClick={() => onDialog({ kind: "note", order: o })}>
            <StickyNote className="h-4 w-4" />
          </IconLink>
          <a
            href={`https://wa.me/${o.buyer_wa}?text=${encodeURIComponent(`Halo ${o.buyer_name}, terkait pesanan ${o.order_code}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Chat WhatsApp"
            aria-label="Chat WhatsApp"
            className="grid h-10 w-10 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-emerald-700"
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        </div>
      </div>
    </li>
  );
}

function IconLink({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="grid h-10 w-10 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
    >
      {children}
    </button>
  );
}

// ------------------------------------------------------------ dialog aksi

function ActionDialog({
  dialog,
  busy,
  onClose,
  onRun,
  onPurge,
}: {
  dialog: Dialog;
  busy: boolean;
  onClose: () => void;
  onRun: (o: OrderRecord, a: AdminOrderAction, opts?: { note?: string | null; amount?: number | null }, ok?: string) => Promise<boolean>;
  onPurge: () => void;
}) {
  const initialText =
    dialog.kind === "note" ? dialog.order.admin_note ?? "" : dialog.kind === "dp" && dialog.order.payment_status === "dp"
      ? String(dialog.order.amount_paid ?? "")
      : "";
  const [text, setText] = useState(initialText);
  const [err, setErr] = useState<string | null>(null);

  const footer = (label: string, onConfirm: () => void, tone: "primary" | "danger" = "primary") => (
    <div className="mt-5 flex justify-end gap-2">
      <button onClick={onClose} disabled={busy} className="min-h-10 rounded-lg px-4 text-sm text-gray-600 hover:bg-gray-100">
        Batal
      </button>
      <button
        onClick={onConfirm}
        disabled={busy}
        className={`inline-flex min-h-10 items-center gap-2 rounded-lg px-4 text-sm font-medium text-white disabled:opacity-60 ${
          tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
        }`}
      >
        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
        {label}
      </button>
    </div>
  );

  if (dialog.kind === "purge") {
    return (
      <Modal title="Hapus semua pesanan batal?" onClose={onClose}>
        <p className="text-sm text-gray-600">
          {dialog.count} pesanan berstatus batal/kedaluwarsa dihapus permanen beserta bukti bayarnya. Pesanan aktif tidak
          tersentuh. Tindakan ini tidak bisa diurungkan.
        </p>
        {footer("Hapus permanen", onPurge, "danger")}
      </Modal>
    );
  }

  const o = dialog.order;

  if (dialog.kind === "dp") {
    const amount = Number(text.replace(/\D/g, ""));
    return (
      <Modal title={`Catat DP · ${o.order_code}`} onClose={onClose}>
        <label className="block text-sm font-medium text-gray-700">
          Nominal DP diterima
          <div className="relative mt-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">Rp</span>
            <input
              inputMode="numeric"
              autoFocus
              value={text}
              onChange={(e) => {
                setErr(null);
                setText(e.target.value.replace(/\D/g, ""));
              }}
              className="h-11 w-full rounded-lg border border-gray-200 pl-10 pr-3 text-base tabular-nums outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
          </div>
        </label>
        <div className="mt-2 flex flex-wrap gap-2">
          {[0.25, 0.5].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setText(String(Math.round((o.total_amount * f) / 1000) * 1000))}
              className="min-h-9 rounded-full border border-gray-200 px-3 text-xs text-gray-600 hover:bg-gray-50"
            >
              {f * 100}% · {formatPrice(Math.round((o.total_amount * f) / 1000) * 1000)}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Total {formatPrice(o.total_amount)}. Sisa tagihan setelah DP:{" "}
          <span className="font-medium text-gray-700">{formatPrice(Math.max(0, o.total_amount - amount))}</span>. Stok
          dikunci untuk pembeli ini.
        </p>
        {err && <p className="mt-2 text-sm text-red-700">{err}</p>}
        {footer("Simpan DP", async () => {
          if (!amount || amount >= o.total_amount) {
            setErr("DP harus lebih dari 0 dan kurang dari total. Bila sudah dibayar penuh, pakai tombol Lunas.");
            return;
          }
          await onRun(o, "confirm_dp", { amount }, `DP ${formatPrice(amount)} dicatat untuk ${o.order_code}.`);
        })}
      </Modal>
    );
  }

  if (dialog.kind === "cancel") {
    const fromBuyer = !!o.cancel_requested_at;
    return (
      <Modal title={fromBuyer ? "Setujui pembatalan?" : "Batalkan pesanan?"} onClose={onClose}>
        <p className="text-sm text-gray-600">
          {o.order_code} dibatalkan dan stok {o.item_count} pcs dikembalikan ke etalase.
          {o.payment_status === "dp" && " Pembeli sudah membayar DP — urus pengembalian dana di luar sistem."}
        </p>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          Alasan (dilihat pembeli)
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            rows={3}
            placeholder={fromBuyer ? o.cancel_request_reason || "Pembatalan atas permintaan pembeli." : "mis. stok habis, pembeli tidak membalas"}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:text-sm"
          />
        </label>
        {footer(
          fromBuyer ? "Setujui & batalkan" : "Batalkan pesanan",
          () => onRun(o, fromBuyer ? "approve_cancel" : "cancel", { note: text }, `${o.order_code} dibatalkan, stok dikembalikan.`),
          "danger"
        )}
      </Modal>
    );
  }

  if (dialog.kind === "reject") {
    return (
      <Modal title="Tolak pengajuan pembatalan" onClose={onClose}>
        <p className="text-sm text-gray-600">Pesanan tetap berjalan. Pembeli melihat alasan penolakan di riwayatnya.</p>
        <label className="mt-4 block text-sm font-medium text-gray-700">
          Alasan penolakan
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={300}
            rows={3}
            autoFocus
            placeholder="mis. barang sudah diproduksi sesuai ukuranmu"
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:text-sm"
          />
        </label>
        {footer("Tolak pengajuan", () => onRun(o, "reject_cancel", { note: text }, "Pengajuan pembatalan ditolak."))}
      </Modal>
    );
  }

  if (dialog.kind === "note") {
    return (
      <Modal title={`Catatan pengurus · ${o.order_code}`} onClose={onClose}>
        <p className="mb-2 text-xs text-gray-500">Hanya terlihat oleh pengurus.</p>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          rows={4}
          autoFocus
          placeholder="mis. ambil di sekret hari Jumat, sudah transfer via BSI"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-base outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 sm:text-sm"
        />
        {footer("Simpan catatan", () => onRun(o, "note", { note: text }, "Catatan disimpan."))}
      </Modal>
    );
  }

  return (
    <Modal title="Hapus pesanan permanen?" onClose={onClose}>
      <p className="text-sm text-gray-600">
        {o.order_code} ({o.buyer_name}) hilang dari daftar pengurus dan riwayat pembeli, beserta bukti bayarnya. Tindakan
        ini tidak bisa diurungkan.
      </p>
      {footer("Hapus permanen", () => onRun(o, "delete", {}, `${o.order_code} dihapus permanen.`), "danger")}
    </Modal>
  );
}

// ------------------------------------------------------- tab rekap per item

interface ItemGroup {
  key: string;
  product: string;
  image?: string | null;
  variants: Map<string, { variant: string; rows: { order: OrderRecord; item: OrderItemRecord }[] }>;
}

const ITEM_FILTERS: { v: Stage | "aktif" | "all"; t: string }[] = [
  { v: "aktif", t: "Semua aktif" },
  { v: "menunggu", t: "Menunggu bayar" },
  { v: "dp", t: "DP" },
  { v: "lunas", t: "Lunas, belum diterima" },
  { v: "diterima", t: "Sudah diterima" },
  { v: "all", t: "Termasuk batal" },
];

function ItemsTab({ orders, loading }: { orders: OrderRecord[]; loading: boolean }) {
  const [filter, setFilter] = useState<Stage | "aktif" | "all">("aktif");
  const [product, setProduct] = useState("");
  const [q, setQ] = useState("");

  const groups = useMemo(() => {
    const map = new Map<string, ItemGroup>();
    orders.forEach((o) => {
      const st = stageOf(o);
      if (filter === "aktif" ? st === "batal" : filter !== "all" && st !== filter) return;
      if (!matchesQuery(q, o.buyer_name, o.buyer_wa, o.order_code, o.buyer_nim)) return;
      (o.items ?? []).forEach((it) => {
        const key = it.product_id ?? it.product_name;
        if (product && key !== product) return;
        let g = map.get(key);
        if (!g) {
          g = { key, product: it.product_name, image: it.image, variants: new Map() };
          map.set(key, g);
        }
        if (!g.image && it.image) g.image = it.image;
        const vk = it.variant || "Tanpa varian";
        const v = g.variants.get(vk) ?? { variant: vk, rows: [] };
        v.rows.push({ order: o, item: it });
        g.variants.set(vk, v);
      });
    });
    return Array.from(map.values()).sort((a, b) => a.product.localeCompare(b.product, "id"));
  }, [orders, filter, product, q]);

  const productOptions = useMemo(() => {
    const m = new Map<string, string>();
    orders.forEach((o) => (o.items ?? []).forEach((it) => m.set(it.product_id ?? it.product_name, it.product_name)));
    return Array.from(m.entries()).sort((a, b) => a[1].localeCompare(b[1], "id"));
  }, [orders]);

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const rows: Record<string, string | number>[] = [];
    groups.forEach((g) =>
      g.variants.forEach((v) =>
        v.rows.forEach(({ order: o, item }) =>
          rows.push({
            Produk: g.product,
            Varian: v.variant,
            Qty: item.qty,
            Pembeli: o.buyer_name,
            WhatsApp: o.buyer_wa,
            NIM: o.buyer_nim ?? "",
            Prodi: o.buyer_prodi ?? "",
            Kode: o.order_code,
            Status: STAGE[stageOf(o)].label,
            Dibayar: o.amount_paid ?? 0,
            Total: o.total_amount,
            Dipesan: formatOrderTime(o.created_at),
            Diterima: o.received_at ? formatOrderTime(o.received_at) : "",
          })
        )
      )
    );
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Rekap");
    XLSX.writeFile(wb, `rekap-pesanan-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-400">
        <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />
        Memuat…
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-sm text-gray-500">
        Siapa memesan apa — dikelompokkan per produk dan varian, lengkap dengan status bayar dan serah terima.
      </p>
      <AdminSearch value={q} onChange={setQ} placeholder="Cari nama pembeli, WA, kode…">
        <select
          value={product}
          onChange={(e) => setProduct(e.target.value)}
          aria-label="Pilih produk"
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-emerald-500"
        >
          <option value="">Semua produk</option>
          {productOptions.map(([k, n]) => (
            <option key={k} value={k}>
              {n}
            </option>
          ))}
        </select>
        <button
          onClick={exportXlsx}
          disabled={groups.length === 0}
          className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <FileDown className="h-4 w-4" /> Excel
        </button>
      </AdminSearch>

      <div className="-mt-1 mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Saring status">
        {ITEM_FILTERS.map((f) => (
          <button
            key={f.v}
            role="tab"
            aria-selected={filter === f.v}
            onClick={() => setFilter(f.v)}
            className={`inline-flex min-h-9 shrink-0 items-center rounded-full border px-3 text-xs font-medium transition-colors ${
              filter === f.v
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {f.t}
          </button>
        ))}
      </div>

      {groups.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center text-sm text-gray-500">
          Tidak ada item untuk filter ini.
        </div>
      )}

      <div className="grid gap-4">
        {groups.map((g) => {
          const all = Array.from(g.variants.values()).flatMap((v) => v.rows);
          const sum = (pred: (o: OrderRecord) => boolean) =>
            all.filter((r) => pred(r.order)).reduce((s, r) => s + r.item.qty, 0);
          const total = all.reduce((s, r) => s + r.item.qty, 0);
          return (
            <section key={g.key} className="overflow-hidden rounded-xl border border-gray-200 bg-white">
              <header className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
                <Thumb src={g.image} size="h-11 w-11" />
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere]">{g.product}</h3>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
                    <span className="font-medium text-gray-900">{total} pcs</span>
                    <span>Menunggu {sum((o) => stageOf(o) === "menunggu" || stageOf(o) === "minta_batal")}</span>
                    <span>DP {sum((o) => stageOf(o) === "dp")}</span>
                    <span>Lunas {sum((o) => stageOf(o) === "lunas")}</span>
                    <span>Diterima {sum((o) => stageOf(o) === "diterima")}</span>
                  </div>
                </div>
              </header>
              {Array.from(g.variants.values()).map((v) => (
                <div key={v.variant} className="border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between bg-gray-50 px-4 py-2 text-xs font-medium text-gray-600">
                    <span>{v.variant}</span>
                    <span className="tabular-nums">{v.rows.reduce((s, r) => s + r.item.qty, 0)} pcs</span>
                  </div>
                  <ul className="divide-y divide-gray-100">
                    {v.rows.map(({ order: o, item }, i) => (
                      <li key={`${o.id}-${i}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                        <span className="w-8 shrink-0 font-semibold tabular-nums text-gray-900">{item.qty}×</span>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-gray-900 [overflow-wrap:anywhere]">{o.buyer_name}</div>
                          <div className="text-xs text-gray-500">
                            {o.buyer_wa}
                            {o.buyer_nim && ` · ${o.buyer_nim}`} · <span className="font-mono">{o.order_code}</span>
                          </div>
                        </div>
                        <StageBadge stage={stageOf(o)} />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}

// --------------------------------------------------------------- tab blokir

function BansTab() {
  const [bans, setBans] = useState<BanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchBans();
    setBans(res.bans);
    setError(res.error ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    fetchBans().then((res) => {
      if (!alive) return;
      setBans(res.bans);
      setError(res.error ?? null);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const shown = showAll ? bans : bans.filter((b) => b.active);

  return (
    <>
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 text-sm text-gray-600">
        <div className="mb-1 flex items-center gap-2 font-medium text-gray-900">
          <Ban className="h-4 w-4" /> Cara kerja anti-spam
        </div>
        Setiap aksi pembeli (pesan, cek pesanan, ajukan batal, hapus riwayat) diberi jeda minimal 2 detik. Lima kali lebih
        cepat dari itu dalam 10 menit, atau lebih dari 20 aksi dalam 1 menit (pola bot), membuat akun diblokir 7 hari. Tamu
        tanpa akun dibatasi per jaringan. Pengurus tidak pernah dibatasi.
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <label className="inline-flex items-center gap-2 text-sm text-gray-600">
          <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} className="h-4 w-4" />
          Tampilkan riwayat yang sudah dibuka/berakhir
        </label>
        <span className="text-xs text-gray-500">{bans.filter((b) => b.active).length} aktif</span>
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {loading && <Loader2 className="mx-auto my-8 h-5 w-5 animate-spin text-gray-400" />}
      {!loading && shown.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center text-sm text-gray-500">
          Tidak ada akun yang sedang diblokir.
        </div>
      )}

      <ul className="grid gap-2">
        {shown.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gray-100 text-gray-500">
              {b.kind === "akun" ? <Users className="h-4 w-4" /> : <ShieldOff className="h-4 w-4" />}
            </span>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-medium text-gray-900 [overflow-wrap:anywhere]">
                {b.label || "Tanpa nama"}
                {b.email && b.email !== b.label && <span className="font-normal text-gray-500"> · {b.email}</span>}
              </div>
              <div className="text-xs text-gray-500">{b.reason}</div>
              <div className="text-xs text-gray-500">
                {formatOrderTime(b.created_at)} ·{" "}
                {b.lifted_at
                  ? `dibuka ${b.lifted_by ?? ""} ${formatOrderTime(b.lifted_at)}`
                  : b.active
                    ? `sampai ${formatOrderTime(b.banned_until)}`
                    : "sudah berakhir"}
              </div>
            </div>
            {b.active && (
              <button
                onClick={async () => {
                  setBusy(b.id);
                  const res = await unban(b.id);
                  setBusy(null);
                  if (!res.ok) setError(res.error ?? "Gagal membuka blokir.");
                  else await load();
                }}
                disabled={busy === b.id}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-gray-200 px-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {busy === b.id && <Loader2 className="h-4 w-4 animate-spin" />}
                Buka blokir
              </button>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
