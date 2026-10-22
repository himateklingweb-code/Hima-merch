"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  LogOut,
  ShoppingBag,
  Pencil,
  Check,
  X,
  QrCode,
  Building2,
  LayoutDashboard,
  CalendarCheck,
} from "lucide-react";
import { formatPrice } from "@/data/products";
import { fetchMyOrders, type PublicOrderReceipt } from "@/lib/orders-repo";
import { useAuth } from "@/components/AuthContext";
import AttendanceScanner from "@/components/AttendanceScanner";
import { fetchMyAttendance, type MyAttendance } from "@/lib/attendance-repo";
import { NAME_MAX, saveDisplayName } from "@/lib/profile-repo";
import { ROLE_LABEL } from "@/lib/roles";

const statusConfig = {
  pending_verifikasi: {
    label: "Menunggu Verifikasi",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  terjual: {
    label: "Dikonfirmasi",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  dibatalkan: {
    label: "Dibatalkan",
    color: "bg-red-100 text-red-800",
    icon: XCircle,
  },
  kadaluarsa: {
    label: "Kadaluarsa",
    color: "bg-gray-100 text-gray-600",
    icon: AlertCircle,
  },
} as const;

const paymentConfig = {
  belum_lunas: { label: "Belum Lunas", color: "bg-red-100 text-red-800" },
  dp: { label: "DP", color: "bg-amber-100 text-amber-800" },
  lunas: { label: "Lunas", color: "bg-green-100 text-green-800" },
} as const;

function OrderCard({ order }: { order: PublicOrderReceipt }) {
  const status = statusConfig[order.order_status];
  const Icon = status.icon;
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-4 py-3 sm:px-5">
        <div>
          <div className="text-[10px] text-gray-400">Kode Pesanan</div>
          <div className="font-mono text-sm font-bold text-gray-900">
            {order.order_code}
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-xs ${status.color}`}
        >
          <Icon className="h-3.5 w-3.5" />
          {status.label}
        </span>
      </div>

      <div className="divide-y divide-gray-100">
        {(order.items ?? []).map((item, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 px-4 py-3 sm:px-5"
          >
            <div className="min-w-0">
              <div className="text-sm font-medium text-gray-900">
                {item.product_name}
              </div>
              <div className="mt-0.5 flex flex-wrap gap-x-2 text-xs text-gray-400">
                {item.variant && <span>{item.variant}</span>}
                <span>
                  {item.stock_type_snapshot === "ready_stock"
                    ? "Ready Stock"
                    : "Pre-Order"}
                </span>
                <span>× {item.qty}</span>
              </div>
            </div>
            {item.subtotal > 0 && (
              <div className="shrink-0 text-sm font-medium text-gray-900">
                {formatPrice(item.subtotal)}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="space-y-3 border-t border-gray-100 p-4 sm:p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Total</span>
          <span className="font-bold text-gray-900">
            {order.total_amount > 0 ? formatPrice(order.total_amount) : "—"}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">
            {new Date(order.created_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${
              paymentConfig[order.payment_status].color
            }`}
          >
            {paymentConfig[order.payment_status].label}
          </span>
        </div>

        {order.order_status === "pending_verifikasi" && (
          <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
            <p className="font-medium">Menunggu verifikasi KWU.</p>
            <p className="mt-0.5 text-yellow-600">
              Pengurus KWU akan mengonfirmasi pembayaran lewat WhatsApp.
            </p>
          </div>
        )}

        {order.order_status === "kadaluarsa" && (
          <div className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
            Pesanan kadaluarsa — tidak diverifikasi tepat waktu. Silakan pesan
            ulang.
          </div>
        )}
      </div>
    </div>
  );
}

/** Nama tampilan yang bisa diubah sendiri. Email tidak pernah ditampilkan. */
function NameEditor({
  name,
  onSaved,
}: {
  name: string;
  onSaved: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    const r = await saveDisplayName(value);
    if (r.ok) {
      await onSaved();
      setEditing(false);
    } else setError(r.error ?? "Gagal menyimpan nama.");
    setBusy(false);
  };

  if (!editing) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <h1 className="truncate text-lg font-bold text-gray-900 sm:text-2xl">
          {name}
        </h1>
        <button
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
          className="shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700"
          aria-label="Ubah nama tampilan"
          title="Ubah nama tampilan"
        >
          <Pencil className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center gap-1.5">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={NAME_MAX}
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") void save();
            if (e.key === "Escape") setEditing(false);
          }}
          aria-label="Nama tampilan"
          placeholder="Nama tampilanmu"
          className="w-full min-w-0 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
        />
        <button
          onClick={save}
          disabled={busy}
          className="shrink-0 rounded-lg bg-emerald-600 p-2 text-white hover:bg-emerald-700 disabled:opacity-60"
          aria-label="Simpan nama"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="shrink-0 rounded-lg border border-gray-200 p-2 text-gray-500 hover:bg-gray-50"
          aria-label="Batal"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function AkunPage() {
  const router = useRouter();
  const { user, loading, displayName, avatarUrl, profile, refreshProfile, signOut } =
    useAuth();
  const [orders, setOrders] = useState<PublicOrderReceipt[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [attendance, setAttendance] = useState<MyAttendance[]>([]);
  const [scanning, setScanning] = useState(false);

  // Signed out → send to the login page and come back here after.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/masuk?redirect=/akun");
    }
  }, [loading, user, router]);

  // Pakai id supaya refresh token tidak memicu muat ulang.
  const userId = user?.id;
  useEffect(() => {
    if (!userId) return;
    let active = true;
    Promise.all([fetchMyOrders(), fetchMyAttendance()]).then(([rows, att]) => {
      if (!active) return;
      setOrders(rows);
      setAttendance(att);
      setLoadingOrders(false);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const reloadAttendance = useCallback(() => {
    void fetchMyAttendance().then(setAttendance);
  }, []);
  const closeScanner = useCallback(() => setScanning(false), []);

  const handleSignOut = async () => {
    await signOut();
    router.replace("/");
  };

  if (loading || !user) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
      </div>
    );
  }

  const isMember = Boolean(profile?.department_id);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      {scanning && (
        <AttendanceScanner onClose={closeScanner} onSuccess={reloadAttendance} />
      )}

      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full bg-emerald-100 sm:h-14 sm:w-14">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                width={56}
                height={56}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg font-bold text-emerald-700">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <NameEditor
              key={displayName}
              name={displayName}
              onSaved={refreshProfile}
            />
            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
              {profile?.department_name ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-medium text-emerald-800">
                  <Building2 className="h-3 w-3" />
                  Anggota · {profile.department_name}
                </span>
              ) : (
                <span className="text-gray-500">Akun pembeli</span>
              )}
              {profile?.staff_role && (
                <span className="rounded-full bg-gray-900 px-2 py-0.5 font-medium text-white">
                  {ROLE_LABEL[profile.staff_role]}
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-50 hover:text-gray-900"
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </button>
      </div>

      {/* Absensi & panel */}
      <div className="mb-8 grid gap-3 sm:grid-cols-2">
        <button
          onClick={() => setScanning(true)}
          disabled={!isMember}
          className="flex items-center gap-3 rounded-xl bg-emerald-600 p-4 text-left text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/15">
            <QrCode className="h-6 w-6" />
          </span>
          <span>
            <span className="block text-sm font-semibold">Absensi</span>
            <span className="block text-xs opacity-80">
              {isMember
                ? "Scan QR kegiatan. Butuh izin kamera & lokasi."
                : "Hubungi admin agar akunmu dimasukkan ke departemen."}
            </span>
          </span>
        </button>

        {profile?.staff_role && (
          <Link
            href="/admin"
            className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:bg-gray-50"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
              <LayoutDashboard className="h-6 w-6" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900">
                Admin Panel
              </span>
              <span className="block text-xs text-gray-500">
                Masuk sebagai {ROLE_LABEL[profile.staff_role]}
              </span>
            </span>
          </Link>
        )}
      </div>

      {isMember && (
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-emerald-600" />
            <h2 className="font-bold text-gray-900">Riwayat Absensi</h2>
          </div>
          {attendance.length === 0 ? (
            <p className="rounded-xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
              Belum ada absensi.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
              {attendance.map((a) => (
                <li
                  key={`${a.session_title}-${a.checked_at}`}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm font-medium text-gray-900">
                    {a.session_title}
                  </span>
                  <span className="shrink-0 text-xs text-gray-500">
                    {new Date(a.checked_at).toLocaleString("id-ID", {
                      day: "numeric",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <Package className="h-5 w-5 text-emerald-600" />
        <h2 className="font-bold text-gray-900">Riwayat Pesanan</h2>
      </div>

      {loadingOrders ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-white py-12 text-center">
          <ShoppingBag className="mx-auto mb-3 h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-500">Belum ada pesanan.</p>
          <Link
            href="/merchandise"
            className="mt-4 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            Lihat merchandise
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <OrderCard key={o.order_code} order={o} />
          ))}
        </div>
      )}
    </div>
  );
}
