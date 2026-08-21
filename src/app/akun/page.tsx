"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import { formatPrice } from "@/data/products";
import { fetchMyOrders, type PublicOrderReceipt } from "@/lib/orders-repo";
import { useAuth } from "@/components/AuthContext";
import PaymentProofUpload from "@/app/pesanan/cek/PaymentProofUpload";

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
          <>
            <div className="rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
              <p className="font-medium">Menunggu verifikasi kasir.</p>
              <p className="mt-0.5 text-yellow-600">
                Sudah transfer? Unggah buktinya supaya kasir bisa memverifikasi
                lebih cepat.
              </p>
            </div>
            <PaymentProofUpload
              orderCode={order.order_code}
              alreadyUploaded={Boolean(order.has_payment_proof)}
            />
          </>
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

export default function AkunPage() {
  const router = useRouter();
  const { user, loading, displayName, avatarUrl, signOut } = useAuth();
  const [orders, setOrders] = useState<PublicOrderReceipt[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  // Signed out → send to the login page and come back here after.
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/masuk?redirect=/akun");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingOrders(true);
    fetchMyOrders().then((rows) => {
      if (!active) return;
      setOrders(rows);
      setLoadingOrders(false);
    });
    return () => {
      active = false;
    };
  }, [user]);

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

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
      <div className="mb-6 flex items-start justify-between gap-4 sm:mb-8">
        <div className="flex min-w-0 items-center gap-3 sm:gap-4">
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
          <div className="min-w-0">
            <h1 className="truncate text-lg font-bold text-gray-900 sm:text-2xl">
              {displayName}
            </h1>
            {user.email && (
              <p className="truncate text-xs text-gray-500 sm:text-sm">
                {user.email}
              </p>
            )}
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
