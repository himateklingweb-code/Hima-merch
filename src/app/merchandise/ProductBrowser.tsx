"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Ban,
  CheckCircle2,
  Clock,
  Search,
  ShoppingBag,
  X,
  XCircle,
} from "lucide-react";
import { formatPrice } from "@/data/products";
import { matchesQuery } from "@/lib/search";

export type BadgeColor = "green" | "yellow" | "red" | "gray";

/** Data kartu produk yang sudah dihitung di server (aman diserialisasi). */
export interface ProductCard {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  /** Harga termurah (varian termurah bila bervarian). */
  price: number;
  /** Harga termahal; sama dengan price bila tidak ada rentang. */
  priceMax: number;
  /** Harga coret, hanya terisi bila memang lebih mahal dari price. */
  compareAt: number | null;
  discount: number | null;
  featured: boolean;
  image: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  variants: string[];
  badgeLabel: string;
  badgeColor: BadgeColor;
  /** Sisa stok ready stock; null untuk pre-order. */
  readyLeft: number | null;
}

const BADGE = {
  green: { icon: CheckCircle2, short: "Tersedia", cls: "bg-green-100 text-green-800" },
  yellow: { icon: Clock, short: "Pre-Order", cls: "bg-yellow-100 text-yellow-800" },
  red: { icon: XCircle, short: "Ditutup", cls: "bg-red-100 text-red-800" },
  gray: { icon: Ban, short: "Habis", cls: "bg-gray-100 text-gray-600" },
} as const;

const FILTERS: { key: "all" | BadgeColor | "open"; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "open", label: "Bisa dipesan" },
  { key: "green", label: "Ready stock" },
  { key: "yellow", label: "Pre-order" },
];

type SortKey = "default" | "price-asc" | "price-desc" | "name";

export default function ProductBrowser({ products }: { products: ProductCard[] }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["key"]>("all");
  const [sort, setSort] = useState<SortKey>("default");
  const [cat, setCat] = useState("");

  const categories = useMemo(
    () =>
      Array.from(new Set(products.map((p) => p.category.trim()).filter(Boolean))).sort((a, b) =>
        a.localeCompare(b, "id")
      ),
    [products]
  );

  const shown = useMemo(() => {
    const list = products.filter((p) => {
      if (filter === "open" && p.badgeColor !== "green" && p.badgeColor !== "yellow")
        return false;
      if ((filter === "green" || filter === "yellow") && p.badgeColor !== filter)
        return false;
      if (cat && p.category !== cat) return false;
      return matchesQuery(q, p.name, p.description, p.category, ...p.variants);
    });
    if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name") list.sort((a, b) => a.name.localeCompare(b.name, "id"));
    return list;
  }, [products, q, filter, sort, cat]);

  const filtered = q.trim() !== "" || filter !== "all" || cat !== "";

  return (
    <>
      {/* Pencarian + filter. Hanya muncul kalau produknya cukup banyak untuk dicari. */}
      {products.length > 3 && (
        <div className="mb-5 sm:mb-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="relative flex-1 sm:max-w-sm">
            <span className="sr-only">Cari merchandise</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kaos, totebag, ukuran…"
              className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-9 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Hapus pencarian"
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-md text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.length > 1 && (
              <select
                value={cat}
                onChange={(e) => setCat(e.target.value)}
                aria-label="Kategori"
                className="h-9 shrink-0 rounded-full border border-gray-200 bg-white px-3 text-xs text-gray-700 outline-none focus:border-emerald-500"
              >
                <option value="">Semua kategori</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            )}
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                aria-pressed={filter === f.key}
                className={`h-9 shrink-0 rounded-full border px-3.5 text-xs font-medium transition-colors ${
                  filter === f.key
                    ? "border-emerald-700 bg-emerald-700 text-white"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                }`}
              >
                {f.label}
              </button>
            ))}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Urutkan"
              className="h-9 shrink-0 rounded-full border border-gray-200 bg-white px-3 text-xs text-gray-600 outline-none focus:border-emerald-500 sm:ml-auto"
            >
              <option value="default">Urutan default</option>
              <option value="price-asc">Harga termurah</option>
              <option value="price-desc">Harga termahal</option>
              <option value="name">Nama A–Z</option>
            </select>
          </div>
        </div>
      )}

      {filtered && (
        <p className="mb-3 text-xs text-gray-500" aria-live="polite">
          {shown.length} dari {products.length} produk
        </p>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-14 text-center">
          <p className="text-sm font-medium text-gray-700">
            {products.length === 0
              ? "Belum ada merchandise yang dijual. Pantau terus, ya."
              : "Tidak ada produk yang cocok."}
          </p>
          {products.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setQ("");
                setFilter("all");
                setCat("");
              }}
              className="mt-3 text-sm font-medium text-emerald-700 hover:underline"
            >
              Tampilkan semua produk
            </button>
          )}
        </div>
      ) : (
        /* Mobile: compact 2-col grid, Desktop: 3-col */
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {shown.map((product) => {
            const badge = BADGE[product.badgeColor];
            const BadgeIcon = badge.icon;
            return (
              <Link
                key={product.id}
                href={`/merchandise/${product.slug}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg active:scale-[0.98] transition-all"
              >
                <div className="aspect-square sm:aspect-[4/3] bg-gray-100 relative overflow-hidden">
                  {product.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image}
                      alt={product.name}
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-gray-300">
                      <ShoppingBag className="w-10 sm:w-16 h-10 sm:h-16" />
                    </div>
                  )}
                  {product.discount && (
                    <span className="absolute right-2 top-2 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold text-white sm:right-3 sm:top-3 sm:px-2 sm:text-xs">
                      −{product.discount}%
                    </span>
                  )}
                  <div className="absolute top-2 left-2 sm:top-3 sm:left-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[9px] sm:text-xs font-medium px-1.5 sm:px-2.5 py-0.5 sm:py-1 rounded-full ${badge.cls}`}
                    >
                      <BadgeIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 flex-shrink-0" strokeWidth={2} />
                      <span className="hidden sm:inline">{product.badgeLabel}</span>
                      <span className="sm:hidden">{badge.short}</span>
                    </span>
                  </div>
                </div>
                <div className="p-3 sm:p-5">
                  {product.category && (
                    <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide text-gray-500 sm:text-xs">
                      {product.category}
                    </div>
                  )}
                  <h3 className="font-semibold leading-snug text-gray-900 text-[13px] sm:text-base group-hover:text-emerald-700 transition-colors line-clamp-2">
                    {product.name}
                  </h3>
                  <p className="text-[11px] sm:text-sm text-gray-500 mt-0.5 sm:mt-1 line-clamp-2 hidden sm:block">
                    {product.description}
                  </p>

                  <div className="mt-1.5 sm:mt-3 flex flex-wrap items-baseline justify-between gap-x-2">
                    <div className="flex flex-wrap items-baseline gap-x-1.5">
                      <span className="text-sm sm:text-lg font-bold text-emerald-700 tabular-nums">
                        {product.priceMax > product.price
                          ? `${formatPrice(product.price)}+`
                          : formatPrice(product.price)}
                      </span>
                      {product.compareAt && (
                        <span className="text-[11px] text-gray-400 line-through tabular-nums sm:text-sm">
                          {formatPrice(product.compareAt)}
                        </span>
                      )}
                    </div>
                    {product.readyLeft != null && product.readyLeft > 0 && (
                      <span className="text-[10px] sm:text-xs text-gray-400 hidden sm:inline">
                        Sisa {product.readyLeft}
                      </span>
                    )}
                  </div>

                  {product.variants.length > 0 && (
                    <div className="mt-1.5 sm:mt-2 flex gap-1 flex-wrap">
                      {product.variants.slice(0, 6).map((opt) => (
                        <span
                          key={opt}
                          className="text-[10px] sm:text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded"
                        >
                          {opt}
                        </span>
                      ))}
                      {product.variants.length > 6 && (
                        <span className="text-[10px] sm:text-xs text-gray-500 px-1 py-0.5">
                          +{product.variants.length - 6}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
