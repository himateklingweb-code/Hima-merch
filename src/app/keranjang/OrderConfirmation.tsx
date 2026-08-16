"use client";

import Link from "next/link";
import { CheckCircle2, AlertTriangle, MessageCircle } from "lucide-react";

export interface PlacedOrder {
  orderCode: string;
  persisted: boolean;
  error?: string;
  waUrl: string;
}

/**
 * Shown after checkout. This lives in the cart page rather than inside the
 * form because placing an order empties the cart — if it were part of the
 * form it would unmount with it and take the order code with it.
 */
export default function OrderConfirmation({ order }: { order: PlacedOrder }) {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-gray-200 bg-white p-6 text-center sm:p-8">
      <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-600" />
      <h2 className="mb-1 text-xl font-bold text-gray-900">Pesanan dibuat</h2>
      <p className="mb-5 text-sm text-gray-500">
        Simpan kode ini untuk melacak pesananmu.
      </p>

      <div className="mb-5 rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
        <div className="text-[10px] uppercase tracking-[.18em] text-gray-400">
          Kode Pesanan
        </div>
        <div className="font-mono text-2xl font-bold text-gray-900">
          {order.orderCode}
        </div>
      </div>

      {!order.persisted && (
        <div className="mb-5 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-left text-xs text-amber-800">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            Pesanan belum tersimpan ke database
            {order.error ? ` (${order.error})` : ""}. Kode di atas tetap
            berlaku — lanjutkan konfirmasi lewat WhatsApp agar kasir mencatat
            manual.
          </span>
        </div>
      )}

      <a
        href={order.waUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <MessageCircle className="h-4 w-4" />
        Buka WhatsApp kasir
      </a>
      <p className="mt-2 text-xs text-gray-400">
        Tidak terbuka otomatis? Klik tombol di atas.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-4 border-t border-gray-100 pt-5 text-sm">
        <Link href="/pesanan/cek" className="text-emerald-700 hover:underline">
          Lacak pesanan
        </Link>
        <Link href="/merchandise" className="text-gray-500 hover:underline">
          Belanja lagi
        </Link>
      </div>
    </div>
  );
}
