"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  getProductBadge,
  formatPrice,
  availableStock,
  variantPrice,
  hasVariants,
  discountPercent,
  maxOrderQty,
  priceAdjustment,
  usesSharedQuota,
  type Product,
  type ProductVariant,
} from "@/data/products";
import { ArrowLeft, ShoppingBag, Check, Clock, ImageOff, Ruler } from "lucide-react";
import { useCart } from "@/components/CartContext";

/**
 * Interactive half of the product page. The surrounding server component
 * resolves the product and its meta tags, so this only owns the bits that
 * need state: gallery image, variant pick, quantity, and adding to the
 * basket.
 *
 * Ordering goes through the cart now rather than straight to WhatsApp, so
 * several products can be bought in one message.
 */
export default function ProductDetail({ product }: { product: Product }) {
  const { add } = useCart();
  const router = useRouter();
  const [qty, setQty] = useState(1);

  const usesAttrs = hasVariants(product);
  // Legacy single-axis variant (free text), only relevant when the product
  // has no real variant rows.
  const [legacyVariant, setLegacyVariant] = useState<string | null>(
    product.variants?.options[0] ?? null
  );
  // New multi-attribute system: one picked value per attribute axis, e.g.
  // { Warna: "Hitam", Ukuran: "L" }. The matching variant is derived below.
  const [picked, setPicked] = useState<Record<string, string>>(() => {
    if (!usesAttrs) return {};
    const first = product.variantList[0];
    return first ? { ...first.options } : {};
  });
  const [activeImage, setActiveImage] = useState(0);
  const [added, setAdded] = useState(false);

  const selectedVariant: ProductVariant | null = useMemo(() => {
    if (!usesAttrs) return null;
    return (
      product.variantList.find((v) =>
        product.attributes.every((a) => v.options[a.name] === picked[a.name])
      ) ?? null
    );
  }, [usesAttrs, product, picked]);

  const badge = getProductBadge(product);
  const BadgeIcon = badge.icon;
  const isPreOrder = product.stock_type === "pre_order";
  const sharedQuota = usesSharedQuota(product);
  const poOpen = !!product.po_deadline && new Date(product.po_deadline) > new Date();
  const available = usesAttrs
    ? selectedVariant
      ? availableStock(product, selectedVariant)
      : 0
    : availableStock(product);
  const price = usesAttrs ? variantPrice(product, selectedVariant) : product.price;
  const compareAt = product.compare_at_price ?? null;
  const discount = discountPercent({ price, compare_at_price: compareAt });
  // Batas jumlah: sisa stok/kuota, dibatasi lagi oleh "maks. per pesanan".
  const maxQty = maxOrderQty(product, available);
  const canOrder =
    maxQty > 0 &&
    (usesAttrs ? !!selectedVariant : true) &&
    (!isPreOrder || poOpen);

  // Ganti varian bisa menurunkan sisa stok, jadi jumlah yang dipakai selalu
  // dikunci ke batas terbaru (dihitung, bukan disimpan ulang ke state).
  const qtyNow = Math.max(1, Math.min(qty, Math.max(1, maxQty)));

  const images = product.images.filter((i) => i.url);
  const variantImage = usesAttrs ? selectedVariant?.image || null : null;
  const shownImage = variantImage || images[activeImage]?.url || null;
  // Rasio wadah mengikuti foto galeri yang tampil; foto varian (ukuran
  // tak diketahui) ditampilkan utuh di wadah persegi.
  const ratio =
    !variantImage && images[activeImage]?.width && images[activeImage]?.height
      ? `${images[activeImage]!.width}/${images[activeImage]!.height}`
      : "1/1";

  const handleAdd = (goToCart: boolean) => {
    add(
      product,
      usesAttrs ? selectedVariant : null,
      usesAttrs ? null : legacyVariant,
      qtyNow
    );
    if (goToCart) {
      router.push("/keranjang");
      return;
    }
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1800);
  };

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
        <div>
          <div
            className="bg-gray-100 rounded-xl sm:rounded-2xl flex items-center justify-center relative overflow-hidden"
            style={{ aspectRatio: ratio, maxHeight: "min(78vh, 640px)" }}
          >
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownImage}
                alt={images[activeImage]?.alt_text || product.name}
                className="w-full h-full object-contain"
              />
            ) : (
              <ShoppingBag className="w-16 sm:w-24 h-16 sm:h-24 text-gray-300" />
            )}
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

          {images.length > 1 && (
            <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
              {images.map((img, i) => (
                <button
                  key={img.url}
                  type="button"
                  onClick={() => setActiveImage(i)}
                  aria-label={`Lihat foto ${i + 1}`}
                  aria-pressed={i === activeImage}
                  className={`shrink-0 h-14 w-14 sm:h-16 sm:w-16 rounded-lg overflow-hidden border-2 ${
                    i === activeImage ? "border-emerald-600" : "border-transparent"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt_text || `${product.name} ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div>
          {product.category && (
            <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
              {product.category}
            </div>
          )}
          <h1 className="text-xl font-bold leading-tight text-gray-900 [overflow-wrap:anywhere] sm:text-3xl">
            {product.name}
          </h1>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1 sm:mt-3">
            <span className="text-xl font-bold tabular-nums text-emerald-700 sm:text-2xl">{formatPrice(price)}</span>
            {discount && (
              <>
                <span className="text-sm tabular-nums text-gray-400 line-through sm:text-base">
                  {formatPrice(compareAt!)}
                </span>
                <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-semibold text-red-700">
                  Hemat {discount}%
                </span>
              </>
            )}
          </div>

          {product.description && (
            <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 sm:mt-4 sm:text-base">
              {product.description}
            </p>
          )}

          {/* Stock Info */}
          <div className="mt-4 sm:mt-6 bg-gray-50 rounded-xl p-3.5 sm:p-4 space-y-1.5 sm:space-y-2">
            {isPreOrder ? (
              <>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">
                    {sharedQuota ? "Kuota PO (semua varian)" : usesAttrs ? "Kuota PO varian ini" : "Kuota PO"}
                  </span>
                  <span className="font-medium">
                    {sharedQuota || !usesAttrs ? product.po_quota ?? 0 : selectedVariant?.po_quota ?? 0} pcs
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Sisa slot</span>
                  <span className="font-medium text-emerald-700">{Math.max(0, available)} pcs</span>
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
                <span className={`font-medium ${available > 0 && available <= 3 ? "text-amber-700" : ""}`}>
                  {usesAttrs && !selectedVariant ? "–" : `${available} pcs`}
                </span>
              </div>
            )}
            {product.max_per_order && (
              <div className="flex justify-between text-xs sm:text-sm">
                <span className="text-gray-500">Maks. per pesanan</span>
                <span className="font-medium">{product.max_per_order} pcs</span>
              </div>
            )}
          </div>

          {/* Variants: new multi-attribute system */}
          {usesAttrs &&
            product.attributes.map((attr) => (
              <div key={attr.name} className="mt-4 sm:mt-6">
                <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-2">
                  {attr.name}
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    ...new Set(
                      product.variantList.map((v) => v.options[attr.name])
                    ),
                  ].map((opt) => {
                    const candidate = { ...picked, [attr.name]: opt };
                    const match = product.variantList.find((v) =>
                      product.attributes.every(
                        (a) => v.options[a.name] === candidate[a.name]
                      )
                    );
                    const soldOut = !!match && availableStock(product, match) <= 0;
                    const extra = priceAdjustment(attr, opt);
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!match}
                        onClick={() => setPicked(candidate)}
                        aria-pressed={picked[attr.name] === opt}
                        title={soldOut ? `${opt} habis` : undefined}
                        className={`min-h-10 min-w-11 px-3.5 sm:px-4 rounded-lg border text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
                          picked[attr.name] === opt
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : match
                              ? soldOut
                                ? "border-gray-200 text-gray-400 line-through"
                                : "border-gray-200 text-gray-700 hover:border-gray-300"
                              : "border-gray-100 text-gray-300 cursor-not-allowed"
                        }`}
                      >
                        {opt}
                        {extra !== 0 && (
                          <span className="ml-1 text-[11px] font-normal text-gray-500">
                            {extra > 0 ? "+" : "−"}
                            {formatPrice(Math.abs(extra))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          {usesAttrs && !selectedVariant && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-700">
              <ImageOff className="w-3.5 h-3.5" />
              Kombinasi ini tidak tersedia.
            </p>
          )}

          {/* Variants: legacy single-axis system */}
          {!usesAttrs && product.variants && (
            <div className="mt-4 sm:mt-6">
              <label className="text-xs sm:text-sm font-medium text-gray-700 block mb-2">
                {product.variants.name}
              </label>
              <div className="flex flex-wrap gap-2">
                {product.variants.options.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setLegacyVariant(opt)}
                    className={`px-3.5 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
                      legacyVariant === opt
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

          {product.size_chart && (
            <details className="mt-4 rounded-xl border border-gray-200 sm:mt-6">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3.5 text-sm font-medium text-gray-800">
                <Ruler className="h-4 w-4 text-gray-500" />
                Panduan ukuran
              </summary>
              <pre className="whitespace-pre-wrap border-t border-gray-100 px-3.5 py-3 font-sans text-xs leading-relaxed text-gray-600 sm:text-sm">
                {product.size_chart}
              </pre>
            </details>
          )}

          {/* Quantity */}
          <div className="mt-4 sm:mt-6">
            <span id="qty-label" className="text-xs sm:text-sm font-medium text-gray-700 block mb-2">Jumlah</span>
            <div className="flex items-center gap-3" role="group" aria-labelledby="qty-label">
              <button
                type="button"
                onClick={() => setQty(Math.max(1, qtyNow - 1))}
                disabled={qtyNow <= 1}
                aria-label="Kurangi jumlah"
                className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100 disabled:opacity-40"
              >
                −
              </button>
              <span className="w-10 text-center font-medium text-base tabular-nums sm:text-lg" aria-live="polite">{qtyNow}</span>
              <button
                type="button"
                onClick={() => setQty(Math.min(Math.max(1, maxQty), qtyNow + 1))}
                disabled={qtyNow >= maxQty}
                aria-label="Tambah jumlah"
                className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 active:bg-gray-100 disabled:opacity-40"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky bottom bar on mobile */}
      <div className="fixed bottom-0 left-0 right-0 sm:static sm:mt-6 bg-white border-t sm:border-t-0 border-gray-200 px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center gap-3 sm:block">
          <div className="flex-1 sm:hidden">
            <div className="text-[10px] text-gray-400">Total</div>
            <div className="text-lg font-bold text-emerald-700">{formatPrice(price * qtyNow)}</div>
          </div>

          {/* Desktop total */}
          <div className="hidden sm:flex items-center justify-between p-4 bg-emerald-50 rounded-xl mb-4">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-xl font-bold text-emerald-700">{formatPrice(price * qtyNow)}</span>
          </div>

          {canOrder ? (
            <div className="flex flex-1 gap-2 sm:flex-col sm:gap-2.5">
              <button
                type="button"
                onClick={() => handleAdd(true)}
                className="inline-flex flex-1 items-center justify-center gap-2 bg-emerald-600 text-white font-semibold px-5 py-3 sm:py-3.5 rounded-xl text-sm sm:w-full active:bg-emerald-700 transition-colors"
              >
                <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                <span className="sm:hidden">{isPreOrder ? "Ikut PO" : "Pesan"}</span>
                <span className="hidden sm:inline">
                  {isPreOrder ? "Ikut Pre-Order sekarang" : "Pesan sekarang"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => handleAdd(false)}
                aria-label={added ? "Sudah masuk keranjang" : "Tambah ke keranjang"}
                className="inline-flex items-center justify-center gap-2 border border-emerald-600 text-emerald-700 font-semibold px-4 sm:px-5 py-3 sm:py-3.5 rounded-xl text-sm sm:w-full hover:bg-emerald-50 transition-colors"
              >
                {added ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
                )}
                <span className="hidden sm:inline">
                  {added ? "Masuk keranjang" : "Tambah ke keranjang"}
                </span>
              </button>
            </div>
          ) : (
            <button
              disabled
              className="inline-flex flex-1 items-center justify-center gap-2 bg-gray-200 text-gray-600 font-semibold px-5 py-3 sm:py-3.5 rounded-xl text-sm sm:w-full cursor-not-allowed"
            >
              {usesAttrs && !selectedVariant
                ? "Pilih kombinasi"
                : isPreOrder && !poOpen
                  ? "Pre-order ditutup"
                  : isPreOrder
                    ? "Kuota penuh"
                    : "Stok habis"}
            </button>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-gray-400 mt-1.5 text-center hidden sm:block">
          Checkout lewat keranjang, lalu ringkasan pesanan dikirim ke WhatsApp kasir.
        </p>
      </div>

      {/* Bottom spacer for sticky bar on mobile */}
      <div className="h-20 sm:hidden" />
    </div>
  );
}
