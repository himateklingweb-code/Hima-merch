import { CheckCircle2, Clock, XCircle, Ban, type LucideIcon } from "lucide-react";
import { resolveSeo, type ResolvedSeo, type SeoOverride } from "./seo";

export type StockType = "ready_stock" | "pre_order";

export interface ProductImage {
  url: string;
  alt_text: string;
  /** Natural pixel size of the uploaded file — lets the layout keep the
   *  image's real aspect ratio instead of forcing a fixed crop. */
  width?: number | null;
  height?: number | null;
}

/** One sellable combination of attribute values, e.g. Warna=Hitam + Ukuran=L. */
export interface ProductVariant {
  id: string;
  label: string;
  sku: string | null;
  /** Overrides the product price when set; falls back to it otherwise. */
  price: number | null;
  stock: number;
  stock_reserved: number;
  po_quota: number | null;
  po_filled: number | null;
  po_reserved: number | null;
  image: string | null;
  is_active: boolean;
  order_index: number;
  /** Attribute name → value, e.g. { Warna: "Hitam", Ukuran: "L" }. */
  options: Record<string, string>;
}

/** One variant axis for a product, e.g. "Warna", "Ukuran", "Jenis Lengan". */
export interface ProductAttribute {
  name: string;
  order_index: number;
  /** Biaya tambahan per nilai, mis. { "XXL": 5000, "Panjang": 10000 }.
   *  Hanya informasi tampilan; harga final tetap `variant.price`. */
  price_adjustments?: Record<string, number>;
}

/** "per_variant": tiap varian punya kuota sendiri.
 *  "shared": satu kuota total untuk semua varian (hanya pre-order). */
export type QuotaMode = "per_variant" | "shared";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: ProductImage[];
  stock_type: StockType;
  stock: number;
  stock_reserved: number;
  /** @deprecated kept for old single-axis products; new products use
   *  `attributes`/`variants` instead, which support any number of axes. */
  variants: { name: string; options: string[] } | null;
  attributes: ProductAttribute[];
  variantList: ProductVariant[];
  po_quota: number | null;
  po_filled: number | null;
  po_reserved: number | null;
  po_deadline: string | null;
  /** Cara menghitung kuota pre-order bervarian. Default per varian. */
  quota_mode?: QuotaMode;
  /** Kategori etalase, mis. "Kaos" atau "Aksesoris". Kosong = tanpa kategori. */
  category?: string;
  /** Harga coret sebelum diskon. Hanya tampil bila lebih besar dari `price`. */
  compare_at_price?: number | null;
  /** Produk unggulan — tampil paling depan di beranda dan etalase. */
  is_featured?: boolean;
  /** Urutan manual di etalase (kecil = lebih dulu). */
  order_index?: number;
  weight_grams?: number | null;
  /** Panduan ukuran, teks bebas (satu baris per ukuran). */
  size_chart?: string;
  /** Batas jumlah per pesanan. Kosong = mengikuti stok. */
  max_per_order?: number | null;
  /** Search-result overrides, editable in /admin/seo. */
  seo?: SeoOverride;
}

/** Persen diskon dari harga coret, atau null bila tidak ada diskon. */
export function discountPercent(product: Pick<Product, "price" | "compare_at_price">): number | null {
  const c = product.compare_at_price;
  if (!c || c <= product.price) return null;
  return Math.round(((c - product.price) / c) * 100);
}

/** Urutan etalase: unggulan dulu, lalu urutan manual, lalu yang lebih lama. */
export function sortCatalog<T extends Pick<Product, "is_featured" | "order_index">>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (!!a.is_featured !== !!b.is_featured) return a.is_featured ? -1 : 1;
    return (a.order_index ?? 0) - (b.order_index ?? 0);
  });
}

/** True once a product has at least one real variant row — the add-to-cart
 *  flow then requires picking one instead of accepting a free-text variant. */
export function hasVariants(product: Product): boolean {
  return product.variantList.length > 0;
}

/** True bila produk pre-order bervarian memakai satu kuota total. */
export function usesSharedQuota(product: Pick<Product, "stock_type" | "quota_mode" | "variantList">): boolean {
  return product.stock_type === "pre_order" && product.quota_mode === "shared" && product.variantList.length > 0;
}

/** Sisa kuota gabungan: kuota total dikurangi semua yang terisi/ditahan. */
function sharedLeft(product: Product): number {
  const used = product.variantList.reduce((n, v) => n + (v.po_filled ?? 0) + (v.po_reserved ?? 0), 0);
  return (product.po_quota ?? 0) - used;
}

/** Stock remaining for one variant (or the product itself when it has no
 *  variants), accounting for whatever is currently reserved by open orders.
 *  Kuota gabungan: semua varian berbagi satu sisa yang sama. */
export function availableStock(
  product: Product,
  variant?: ProductVariant | null
): number {
  if (usesSharedQuota(product)) return sharedLeft(product);
  if (variant) {
    return product.stock_type === "ready_stock"
      ? variant.stock - variant.stock_reserved
      : (variant.po_quota ?? 0) - (variant.po_filled ?? 0) - (variant.po_reserved ?? 0);
  }
  return product.stock_type === "ready_stock"
    ? product.stock - product.stock_reserved
    : (product.po_quota ?? 0) - (product.po_filled ?? 0) - (product.po_reserved ?? 0);
}

/** Sisa total produk: jumlah sisa semua varian aktif, atau sisa produk itu
 *  sendiri bila tidak bervarian. Dipakai badge etalase. */
export function totalAvailable(product: Product): number {
  if (usesSharedQuota(product)) return Math.max(0, sharedLeft(product));
  if (product.variantList.length > 0) {
    return product.variantList.reduce(
      (n, v) => n + Math.max(0, availableStock(product, v)),
      0
    );
  }
  return Math.max(0, availableStock(product));
}

/** Jumlah maksimal yang boleh dipesan sekaligus: sisa stok/kuota, dibatasi
 *  lagi oleh `max_per_order` bila diisi pengurus. */
export function maxOrderQty(product: Pick<Product, "max_per_order">, available: number): number {
  const left = Math.max(0, available);
  return product.max_per_order && product.max_per_order > 0
    ? Math.min(left, product.max_per_order)
    : left;
}

/** Rentang harga varian, mis. untuk "Rp85.000 – Rp95.000". */
export function priceRange(product: Product): { min: number; max: number } {
  const prices = product.variantList.length
    ? product.variantList.map((v) => v.price ?? product.price)
    : [product.price];
  return { min: Math.min(...prices), max: Math.max(...prices) };
}

/** Biaya tambahan satu nilai atribut (0 bila tidak ada). */
export function priceAdjustment(attr: ProductAttribute | undefined, value: string): number {
  const n = attr?.price_adjustments?.[value];
  return typeof n === "number" && Number.isFinite(n) ? n : 0;
}

/** Effective price for a given variant, falling back to the product price. */
export function variantPrice(product: Product, variant?: ProductVariant | null): number {
  return variant?.price ?? product.price;
}

export const products: Product[] = [
  {
    id: "prod-1",
    name: "Kaos HMTL UNTAN 2025",
    slug: "kaos-hima-tl-2025",
    description:
      "Kaos resmi HIMA Teknik Lingkungan UNTAN edisi 2025. Bahan cotton combed 30s, sablon DTF premium. Tersedia dalam warna hitam dan putih.",
    price: 85000,
    images: [],
    stock_type: "ready_stock",
    stock: 45,
    stock_reserved: 3,
    variants: { name: "Ukuran", options: ["S", "M", "L", "XL", "XXL"] },
    attributes: [],
    variantList: [],
    po_quota: null,
    po_filled: null,
    po_reserved: null,
    po_deadline: null,
  },
  {
    id: "prod-2",
    name: "Jaket Almamater TL",
    slug: "jaket-almamater-tl",
    description:
      "Jaket almamater eksklusif Teknik Lingkungan UNTAN. Bahan parasut waterproof, bordir logo, cocok untuk kegiatan lapangan maupun sehari-hari.",
    price: 250000,
    images: [],
    stock_type: "pre_order",
    stock: 0,
    stock_reserved: 0,
    variants: { name: "Ukuran", options: ["S", "M", "L", "XL"] },
    attributes: [],
    variantList: [],
    po_quota: 50,
    po_filled: 24,
    po_reserved: 5,
    po_deadline: "2026-09-15",
  },
  {
    id: "prod-3",
    name: "Tote Bag HMTL",
    slug: "tote-bag-hima-tl",
    description:
      "Tote bag kanvas tebal dengan desain eksklusif HMTL UNTAN. Ramah lingkungan, cocok untuk mahasiswa yang peduli bumi.",
    price: 45000,
    images: [],
    stock_type: "ready_stock",
    stock: 0,
    stock_reserved: 0,
    variants: null,
    attributes: [],
    variantList: [],
    po_quota: null,
    po_filled: null,
    po_reserved: null,
    po_deadline: null,
  },
  {
    id: "prod-4",
    name: "Sticker Pack Enviro",
    slug: "sticker-pack-enviro",
    description:
      "Paket stiker bertema lingkungan hidup, berisi 10 lembar stiker vinyl tahan air dengan desain original HMTL.",
    price: 15000,
    images: [],
    stock_type: "ready_stock",
    stock: 120,
    stock_reserved: 0,
    variants: null,
    attributes: [],
    variantList: [],
    po_quota: null,
    po_filled: null,
    po_reserved: null,
    po_deadline: null,
  },
  {
    id: "prod-5",
    name: "Hoodie Green Engineering",
    slug: "hoodie-green-engineering",
    description:
      "Hoodie premium bertema Green Engineering. Bahan fleece tebal, nyaman dipakai sehari-hari. Pre-order batch kedua dibuka!",
    price: 195000,
    images: [],
    stock_type: "pre_order",
    stock: 0,
    stock_reserved: 0,
    variants: { name: "Ukuran", options: ["M", "L", "XL", "XXL"] },
    attributes: [],
    variantList: [],
    po_quota: 40,
    po_filled: 38,
    po_reserved: 2,
    po_deadline: "2026-08-10",
  },
];

export function getProductBadge(product: Product): {
  label: string;
  color: string;
  icon: LucideIcon;
} {
  if (product.stock_type === "ready_stock") {
    if (totalAvailable(product) > 0) {
      return { label: "Ready Stock", color: "green", icon: CheckCircle2 };
    }
    return { label: "Stok Habis", color: "gray", icon: Ban };
  }

  if (product.po_deadline && new Date(product.po_deadline) > new Date()) {
    if (totalAvailable(product) <= 0) {
      return { label: "Kuota Pre-Order Penuh", color: "gray", icon: Ban };
    }
    return { label: "Pre-Order Dibuka", color: "yellow", icon: Clock };
  }
  return { label: "Pre-Order Ditutup", color: "red", icon: XCircle };
}

/**
 * Meta tags for a product detail page. Falls back to the product's own name
 * and description, trimmed to a length search engines will actually show.
 */
export function productSeo(product: Product): ResolvedSeo {
  return resolveSeo(product.seo, {
    title: `${product.name} — Merchandise HMTL UNTAN`,
    description: product.description.slice(0, 160),
    ogImage: product.images.find((i) => i.url)?.url ?? "",
  });
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}

/** URL-safe slug from a product name, used when the field is left blank. */
export function slugifyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
