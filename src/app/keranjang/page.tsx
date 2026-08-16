"use client";

import { useState } from "react";
import Link from "next/link";
import { ShoppingBag, Trash2, ArrowLeft } from "lucide-react";
import { useCart } from "@/components/CartContext";
import { formatPrice } from "@/data/products";
import CheckoutForm from "./CheckoutForm";
import OrderConfirmation, { type PlacedOrder } from "./OrderConfirmation";

export default function CartPage() {
  const { lines, itemCount, total, ready, setQty, remove } = useCart();
  // Held here, not in the form: checkout empties the cart, and the receipt
  // has to outlive that so the buyer still sees their order code.
  const [placed, setPlaced] = useState<PlacedOrder | null>(null);

  if (placed) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <OrderConfirmation order={placed} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/merchandise"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-emerald-700 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Lanjut belanja
      </Link>

      <h1 className="mb-2 text-2xl font-bold text-gray-900 sm:text-4xl">
        Keranjang
      </h1>
      <p className="mb-8 text-sm text-gray-500 sm:text-base">
        Periksa pesananmu, lalu isi data pengiriman. Ringkasan pesanan akan
        dikirim ke WhatsApp kasir untuk konfirmasi pembayaran.
      </p>

      {/* Nothing is rendered until the stored cart is read, so the server
          markup and the first client paint agree. */}
      {!ready ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-400">
          Memuat keranjang…
        </div>
      ) : lines.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-10 text-center">
          <ShoppingBag className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <h2 className="mb-1 font-semibold text-gray-900">
            Keranjang masih kosong
          </h2>
          <p className="mb-5 text-sm text-gray-500">
            Belum ada merchandise yang dipilih.
          </p>
          <Link
            href="/merchandise"
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Lihat merchandise
          </Link>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start">
          {/* Lines */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            {lines.map((line) => (
              <div
                key={line.key}
                className="flex flex-wrap items-start gap-4 border-b border-gray-100 p-4 last:border-b-0 sm:p-5"
              >
                <div className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-gray-100 text-gray-300">
                  <ShoppingBag className="h-6 w-6" />
                </div>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/merchandise/${line.product_slug}`}
                    className="font-medium text-gray-900 hover:underline"
                  >
                    {line.product_name}
                  </Link>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                    {line.variant && (
                      <span className="rounded bg-gray-100 px-2 py-0.5">
                        {line.variant}
                      </span>
                    )}
                    <span
                      className={`rounded px-2 py-0.5 ${
                        line.stock_type === "pre_order"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {line.stock_type === "pre_order"
                        ? "Pre-order"
                        : "Ready stock"}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-500">
                    {formatPrice(line.unit_price)} / pcs
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-lg border border-gray-200">
                    <button
                      onClick={() => setQty(line.key, line.qty - 1)}
                      className="rounded-l-lg px-3 py-1.5 text-gray-500 hover:bg-gray-50"
                      aria-label={`Kurangi ${line.product_name}`}
                    >
                      −
                    </button>
                    <span className="min-w-[3ch] px-2 text-center text-sm font-medium tabular-nums">
                      {line.qty}
                    </span>
                    <button
                      onClick={() => setQty(line.key, line.qty + 1)}
                      disabled={line.qty >= line.max_qty}
                      className="rounded-r-lg px-3 py-1.5 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Tambah ${line.product_name}`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => remove(line.key)}
                    className="rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-red-600"
                    aria-label={`Hapus ${line.product_name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="w-full text-right font-semibold text-gray-900 sm:w-auto sm:min-w-[110px]">
                  {formatPrice(line.qty * line.unit_price)}
                </div>
              </div>
            ))}

            <div className="flex items-center justify-between bg-gray-50 px-5 py-4">
              <span className="text-sm text-gray-500">
                {itemCount} item
              </span>
              <span className="text-lg font-bold text-gray-900">
                {formatPrice(total)}
              </span>
            </div>
          </div>

          {/* Checkout */}
          <CheckoutForm onPlaced={setPlaced} />
        </div>
      )}
    </div>
  );
}
