"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { products, getProductBadge, formatPrice } from "@/data/products";
import { ArrowLeft, ShoppingBag, MessageCircle, Clock } from "lucide-react";

export default function ProductDetailPage() {
  const params = useParams();
  const product = products.find((p) => p.slug === params.slug);
  const [qty, setQty] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(
    product?.variants?.options[0] ?? null
  );

  if (!product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Produk tidak ditemukan</h1>
        <Link href="/merchandise" className="text-emerald-700 hover:underline">
          Kembali ke Merchandise
        </Link>
      </div>
    );
  }

  const badge = getProductBadge(product);
  const BadgeIcon = badge.icon;
  const isPreOrder = product.stock_type === "pre_order";
  const available = isPreOrder
    ? (product.po_quota ?? 0) - (product.po_filled ?? 0) - (product.po_reserved ?? 0)
    : product.stock - product.stock_reserved;
  const canOrder = available > 0 && (!isPreOrder || (product.po_deadline && new Date(product.po_deadline) > new Date()));

  const waMessage = encodeURIComponent(
    `Halo, saya ingin ${isPreOrder ? "ikut Pre-Order" : "memesan"}:\n\n` +
      `Produk: ${product.name}\n` +
      (selectedVariant ? `Varian: ${selectedVariant}\n` : "") +
      `Jumlah: ${qty}\n` +
      `Tipe: ${isPreOrder ? "Pre-Order" : "Ready Stock"}\n` +
      `Total: ${formatPrice(product.price * qty)}\n\n` +
      `Kode Pesanan: ORD-DEMO-${Date.now().toString(36).toUpperCase()}`
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-12 lg:py-16">
      <Link
        href="/merchandise"
        className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-emerald-700 hover:underline mb-4 sm:mb-8"
      >
        <ArrowLeft className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        Semua Produk
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-10">
        {/* Product Image */}
        <div className="aspect-[4/3] sm:aspect-square bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center relative">
          <ShoppingBag className="w-16 sm:w-24 h-16 sm:h-24 text-gray-300" />
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4">
            <span
              className={`inline-flex items-center gap-1 text-[10px] sm:text-sm font-medium px-2 sm:px-3 py-1 sm:py-1.5 rounded-full ${
                badge.color === "green"
                  ? "bg-green-100 text-green-800"
                  : badge.color === "yellow"
                  ? "bg-yellow-100 text-yellow-800"
                  : badge.color === "red"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              <BadgeIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" strokeWidth={2} />
              {badge.label}
            </span>
          </div>
        </div>

        {/* Product Info */}
        <div>
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{product.name}</h1>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1.5 sm:mt-3">{formatPrice(product.price)}</div>

          <p className="text-gray-600 mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed">{product.description}</p>

          {/* Stock Info */}
          <div className="mt-4 sm:mt-6 bg-gray-50 rounded-xl p-3.5 sm:p-4 space-y-1.5 sm:space-y-2">
            {isPreOrder ? (
              <>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Kuota PO</span>
                  <span className="font-medium">{product.po_quota} pcs</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Terisi</span>
                  <span className="font-medium">{(product.po_filled ?? 0) + (product.po_reserved ?? 0)} pcs</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Sisa slot</span>
                  <span className="font-medium text-emerald-700">{available} pcs</span>
                </div>
                <div className="pt-1">
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{
                        width: `${Math.min(100, (((product.po_filled ?? 0) + (product.po_reserved ?? 0)) / (product.po_quota ?? 1)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                {product.po_deadline && (
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm text-amber-600 pt-1">
                    <Clock className="w-3.5 h-3.5" />
                    Deadline:{" "}
                    {new Date(product.po_deadline).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Stok tersedia</span>
                <span className="font-medium">{available} pcs</span>
              </div>
            )}
          </div>

          {/* Variants */}
          {product.variants && (
            <div className="mt-4 sm:mt-6">
              <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-2">
                {product.variants.name}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSelectedVariant(opt)}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
                      selectedVariant === opt
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                        : "border-gray-200 text-gray-600"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-4 sm:mt-6">
            <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-2">Jumlah</label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100"
              >
                -
              </button>
              <span className="w-10 text-center font-medium text-base sm:text-lg">{qty}</span>
              <button
                onClick={() => setQty(Math.min(available, qty + 1))}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar on mobile */}
      <div className="fixed bottom-0 left-0 right-0 sm:static sm:mt-6 bg-white border-t sm:border-t-0 border-gray-200 p-3 sm:p-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center gap-3 sm:block">
          <div className="flex-1 sm:hidden">
            <div className="text-[10px] text-gray-400">Total</div>
            <div className="text-lg font-bold text-emerald-700">{formatPrice(product.price * qty)}</div>
          </div>

          {/* Desktop total */}
          <div className="hidden sm:flex items-center justify-between p-4 bg-emerald-50 rounded-xl mb-4">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-xl font-bold text-emerald-700">{formatPrice(product.price * qty)}</span>
          </div>

          {canOrder ? (
            <a
              href={`https://wa.me/6281234567890?text=${waMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-5 py-3 sm:py-3.5 rounded-xl text-sm sm:w-full active:bg-emerald-700 transition-colors"
            >
              <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="sm:hidden">{isPreOrder ? "Ikut PO" : "Pesan"}</span>
              <span className="hidden sm:inline">{isPreOrder ? "Ikut Pre-Order via WhatsApp" : "Pesan Langsung via WhatsApp"}</span>
            </a>
          ) : (
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-500 font-semibold px-5 py-3 sm:py-3.5 rounded-xl text-sm sm:w-full cursor-not-allowed"
            >
              {isPreOrder ? "PO Ditutup" : "Stok Habis"}
            </button>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 text-center hidden sm:block">
          Pesanan diproses via WhatsApp. Stok direservasi 60 menit setelah pesan.
        </p>
      </div>

      {/* Bottom spacer for sticky bar on mobile */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
