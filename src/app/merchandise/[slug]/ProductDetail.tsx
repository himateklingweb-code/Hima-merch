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
  type Product,
  type ProductVariant,
} from "@/data/products";
import { ArrowLeft, ShoppingBag, Check, Clock, ImageOff } from "lucide-react";
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
  const poOpen = !!product.po_deadline && new Date(product.po_deadline) > new Date();
  const available = usesAttrs
    ? selectedVariant
      ? availableStock(product, selectedVariant)
      : 0
    : availableStock(product);
  const price = usesAttrs ? variantPrice(product, selectedVariant) : product.price;
  const canOrder =
    available > 0 &&
    (usesAttrs ? !!selectedVariant : true) &&
    (!isPreOrder || poOpen);

  const images = product.images.filter((i) => i.url);
  const shownImage =
    (usesAttrs && selectedVariant?.image) || images[activeImage]?.url || null;

  const handleAdd = (goToCart: boolean) => {
    add(
      product,
      usesAttrs ? selectedVariant : null,
      usesAttrs ? null : legacyVariant,
      qty
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
            style={{
              aspectRatio:
                images[activeImage]?.width && images[activeImage]?.height
                  ? `${images[activeImage]!.width}/${images[activeImage]!.height}`
                  : "4/3",
            }}
          >
            {shownImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shownImage}
                alt={images[activeImage]?.alt_text || product.name}
                className="w-full h-full object-cover"
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
          <h1 className="text-xl sm:text-3xl font-bold text-gray-900">{product.name}</h1>
          <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1.5 sm:mt-3">{formatPrice(price)}</div>

          <p className="text-gray-600 mt-3 sm:mt-4 text-sm sm:text-base leading-relaxed">{product.description}</p>

          {/* Stock Info */}
          <div className="mt-4 sm:mt-6 bg-gray-50 rounded-xl p-3.5 sm:p-4 space-y-1.5 sm:space-y-2">
            {isPreOrder ? (
              <>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Kuota PO</span>
                  <span className="font-medium">
                    {usesAttrs ? selectedVariant?.po_quota ?? 0 : product.po_quota} pcs
                  </span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm">
                  <span className="text-gray-500">Sisa slot</span>
                  <span className="font-medium text-emerald-700">{available} pcs</span>
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
                    const stillExists = product.variantList.some((v) =>
                      product.attributes.every(
                        (a) => v.options[a.name] === candidate[a.name]
                      )
                    );
                    return (
                      <button
                        key={opt}
                        type="button"
                        disabled={!stillExists}
                        onClick={() => setPicked(candidate)}
                        className={`px-3.5 sm:px-4 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors active:scale-95 ${
                          picked[attr.name] === opt
                            ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                            : stillExists
                              ? "border-gray-200 text-gray-600"
                              : "border-gray-100 text-gray-300 cursor-not-allowed"
                        }`}
                      >
                        {opt}
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
                onClick={() => setQty(Math.min(Math.max(1, available), qty + 1))}
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
            <div className="text-lg font-bold text-emerald-700">{formatPrice(price * qty)}</div>
          </div>

          {/* Desktop total */}
          <div className="hidden sm:flex items-center justify-between p-4 bg-emerald-50 rounded-xl mb-4">
            <span className="text-sm text-gray-600">Total</span>
            <span className="text-xl font-bold text-emerald-700">{formatPrice(price * qty)}</span>
          </div>

          {canOrder ? (
            <div className="flex flex-1 gap-2 sm:flex-col sm:gap-2.5">
              <button
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
                onClick={() => handleAdd(false)}
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
              className="inline-flex items-center justify-center gap-2 bg-gray-200 text-gray-500 font-semibold px-5 py-3 sm:py-3.5 rounded-xl text-sm sm:w-full cursor-not-allowed"
            >
              {usesAttrs && !selectedVariant
                ? "Pilih kombinasi"
                : isPreOrder
                  ? "PO Ditutup"
                  : "Stok Habis"}
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
