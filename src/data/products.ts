export type StockType = "ready_stock" | "pre_order";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  images: { url: string; alt_text: string }[];
  stock_type: StockType;
  stock: number;
  stock_reserved: number;
  variants: { name: string; options: string[] } | null;
  po_quota: number | null;
  po_filled: number | null;
  po_reserved: number | null;
  po_deadline: string | null;
}

export const products: Product[] = [
  {
    id: "prod-1",
    name: "Kaos HIMA TL UNTAN 2025",
    slug: "kaos-hima-tl-2025",
    description:
      "Kaos resmi HIMA Teknik Lingkungan UNTAN edisi 2025. Bahan cotton combed 30s, sablon DTF premium. Tersedia dalam warna hitam dan putih.",
    price: 85000,
    images: [{ url: "/placeholder-product.png", alt_text: "Kaos HIMA TL UNTAN 2025 tampak depan" }],
    stock_type: "ready_stock",
    stock: 45,
    stock_reserved: 3,
    variants: { name: "Ukuran", options: ["S", "M", "L", "XL", "XXL"] },
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
    images: [{ url: "/placeholder-product.png", alt_text: "Jaket Almamater TL tampak depan" }],
    stock_type: "pre_order",
    stock: 0,
    stock_reserved: 0,
    variants: { name: "Ukuran", options: ["S", "M", "L", "XL"] },
    po_quota: 50,
    po_filled: 24,
    po_reserved: 5,
    po_deadline: "2026-09-15",
  },
  {
    id: "prod-3",
    name: "Tote Bag HIMA TL",
    slug: "tote-bag-hima-tl",
    description:
      "Tote bag kanvas tebal dengan desain eksklusif HIMA TL UNTAN. Ramah lingkungan, cocok untuk mahasiswa yang peduli bumi.",
    price: 45000,
    images: [{ url: "/placeholder-product.png", alt_text: "Tote Bag HIMA TL" }],
    stock_type: "ready_stock",
    stock: 0,
    stock_reserved: 0,
    variants: null,
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
      "Paket stiker bertema lingkungan hidup, berisi 10 lembar stiker vinyl tahan air dengan desain original HIMA TL.",
    price: 15000,
    images: [{ url: "/placeholder-product.png", alt_text: "Sticker Pack Enviro" }],
    stock_type: "ready_stock",
    stock: 120,
    stock_reserved: 0,
    variants: null,
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
    images: [{ url: "/placeholder-product.png", alt_text: "Hoodie Green Engineering" }],
    stock_type: "pre_order",
    stock: 0,
    stock_reserved: 0,
    variants: { name: "Ukuran", options: ["M", "L", "XL", "XXL"] },
    po_quota: 40,
    po_filled: 38,
    po_reserved: 2,
    po_deadline: "2026-08-10",
  },
];

export function getProductBadge(product: Product): {
  label: string;
  color: string;
  emoji: string;
} {
  if (product.stock_type === "ready_stock") {
    if (product.stock - product.stock_reserved > 0) {
      return { label: "Tersedia — Bisa Pesan Langsung", color: "green", emoji: "🟢" };
    }
    return { label: "Stok Habis", color: "gray", emoji: "⚪" };
  }

  if (product.po_deadline && new Date(product.po_deadline) > new Date()) {
    const filled = (product.po_filled ?? 0) + (product.po_reserved ?? 0);
    return {
      label: `Pre-Order Dibuka (${filled}/${product.po_quota} sudah pesan)`,
      color: "yellow",
      emoji: "🟡",
    };
  }
  return { label: "Pre-Order Ditutup", color: "red", emoji: "🔴" };
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);
}
