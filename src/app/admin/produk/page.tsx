"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  X,
  AlertTriangle,
  FileDown,
  Loader2,
  ImagePlus,
  Copy,
  Star,
  ChevronLeft,
  ChevronRight,
  WandSparkles,
} from "lucide-react";
import { formatPrice, slugifyName } from "@/data/products";
import { removeContentImage } from "@/lib/content-images";
import { useCollection } from "@/lib/use-collection";
import { getSupabase } from "@/lib/supabase";
import DbStatus from "@/components/admin/DbStatus";
import AdminSearch from "@/components/admin/AdminSearch";
import ImageUpload from "@/components/admin/ImageUpload";
import { matchesQuery } from "@/lib/search";
import { fetchOrders } from "@/lib/orders-repo";

const paymentLabel: Record<string, string> = {
  lunas: "Lunas",
  dp: "DP",
  belum_lunas: "Belum bayar",
};

const orderStatusLabel: Record<string, string> = {
  pending_verifikasi: "Pending",
  terjual: "Terjual",
  dibatalkan: "Batal",
  kadaluarsa: "Expired",
};

/**
 * Recap of everyone who ordered one specific product -- one row per
 * basket line matching that product, across every order regardless of
 * status, so staff can filter/sort in Excel however they need instead of
 * this screen guessing which subset they want.
 */
async function exportProductBuyers(product: {
  id: string;
  name: string;
  slug: string;
}) {
  const { orders } = await fetchOrders();
  const rows: Record<string, string | number>[] = [];

  for (const order of orders) {
    for (const item of order.items ?? []) {
      if (item.product_id !== product.id) continue;
      rows.push({
        "Kode Pesanan": order.order_code,
        Tanggal: new Date(order.created_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        Pembeli: order.buyer_name,
        WhatsApp: order.buyer_wa,
        Alamat: order.buyer_address || "",
        Varian: item.variant || "",
        Qty: item.qty,
        Subtotal: item.subtotal,
        "Status Bayar": paymentLabel[order.payment_status] ?? order.payment_status,
        "Status Pesanan":
          orderStatusLabel[order.order_status] ?? order.order_status,
      });
    }
  }

  if (rows.length === 0) {
    alert(`Belum ada yang memesan "${product.name}".`);
    return;
  }

  const sheet = XLSX.utils.json_to_sheet(rows);
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Pembeli");
  XLSX.writeFile(book, `pembeli-${product.slug || product.id}.xlsx`);
}

/** One gallery photo, in the form the form edits. */
interface ImageRow {
  id: string;
  url: string;
  alt_text: string;
  width: number | null;
  height: number | null;
  order_index: number;
}

/** One sellable combination of attribute values, in the form the form edits. */
interface VariantRow {
  id: string;
  label: string;
  sku: string | null;
  price: number | null;
  stock: number;
  stock_reserved: number;
  po_quota: number | null;
  po_filled: number | null;
  po_reserved: number | null;
  image: string | null;
  is_active: boolean;
  order_index: number;
  options: Record<string, string>;
}

/** The products table as stored, which is what the form edits. The
 *  images/attributes/variants fields only appear on reads (joined via
 *  PRODUCT_SELECT) -- they are stripped before any write to `products`. */
interface ProductRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock_type: "ready_stock" | "pre_order";
  stock: number;
  stock_reserved: number;
  variant_name: string | null;
  variant_options: string[] | null;
  po_quota: number | null;
  po_filled: number | null;
  po_reserved: number | null;
  po_deadline: string | null;
  is_active: boolean;
  category?: string;
  compare_at_price?: number | null;
  is_featured?: boolean;
  order_index?: number;
  weight_grams?: number | null;
  size_chart?: string;
  max_per_order?: number | null;
  images?: ImageRow[];
  attributes?: { name: string; order_index: number }[];
  variants?: (VariantRow & { options?: { attribute_name: string; value: string }[] | Record<string, string> })[];
}

/** Satu baris atribut di form: nama + daftar nilai dipisah koma. */
interface AttrDraft {
  name: string;
  values: string;
}

const uid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

function blankProduct(): ProductRow {
  return {
    id: `prod-${uid()}`,
    name: "",
    slug: "",
    description: "",
    price: 0,
    stock_type: "ready_stock",
    stock: 0,
    stock_reserved: 0,
    variant_name: null,
    variant_options: null,
    po_quota: null,
    po_filled: 0,
    po_reserved: 0,
    po_deadline: null,
    is_active: true,
    category: "",
    compare_at_price: null,
    is_featured: false,
    order_index: 0,
    weight_grams: null,
    size_chart: "",
    max_per_order: null,
    images: [],
    attributes: [],
    variants: [],
  };
}

const PRODUCT_SELECT =
  "*, images:product_images(id, url, alt_text, width, height, order_index), attributes:product_attributes(name, order_index), variants:product_variants(*, options:product_variant_options(attribute_name, value))";

/** Opsi varian dari baris DB (array) atau dari salinan form (objek). */
function optionsOf(v: NonNullable<ProductRow["variants"]>[number]): Record<string, string> {
  const o = v.options;
  if (!o) return {};
  if (Array.isArray(o)) return Object.fromEntries(o.map((x) => [x.attribute_name, x.value]));
  return o;
}

/** Sisa yang masih bisa dipesan, dihitung sama seperti etalase. */
function availableOf(p: ProductRow): number {
  const pre = p.stock_type === "pre_order";
  const left = (stock: number, reserved: number, quota: number | null, filled: number | null, poRes: number | null) =>
    pre ? (quota ?? 0) - (filled ?? 0) - (poRes ?? 0) : stock - reserved;
  const vs = (p.variants ?? []).filter((v) => v.is_active);
  if ((p.variants ?? []).length > 0) {
    return vs.reduce((n, v) => n + Math.max(0, left(v.stock, v.stock_reserved, v.po_quota, v.po_filled, v.po_reserved)), 0);
  }
  return Math.max(0, left(p.stock, p.stock_reserved, p.po_quota, p.po_filled, p.po_reserved));
}

function stripJoined(p: ProductRow): ProductRow {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { images: _i, attributes: _a, variants: _v, ...columns } = p;
  return columns as ProductRow;
}

/** Pesan galat Postgres → kalimat yang bisa dipahami pengurus. */
function friendlyError(msg: string): string {
  if (/foreign key|violates.*order_items/i.test(msg)) {
    return "Produk ini sudah pernah dipesan, jadi tidak bisa dihapus. Sembunyikan saja dari etalase.";
  }
  if (/duplicate key.*slug/i.test(msg)) return "Slug sudah dipakai produk lain. Ganti slug-nya.";
  if (/permission denied|row-level security|42501/i.test(msg)) {
    return "Akunmu tidak punya izin menu Produk.";
  }
  return msg;
}

type Filter = "all" | "ready_stock" | "pre_order" | "featured" | "hidden" | "low";

export default function AdminProdukPage() {
  const { items, loading, live, error, saving, save, remove, reload } =
    useCollection<ProductRow>("products", [], {
      select: PRODUCT_SELECT,
      orderBy: "created_at",
      ascending: true,
      revalidate: (row) => [
        "/",
        "/merchandise",
        ...(row?.slug ? [`/merchandise/${row.slug}`] : []),
      ],
    });

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [cat, setCat] = useState("");

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) => {
        if (!!a.is_featured !== !!b.is_featured) return a.is_featured ? -1 : 1;
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      }),
    [items]
  );

  const categories = useMemo(
    () =>
      Array.from(new Set(items.map((p) => (p.category ?? "").trim()).filter(Boolean))).sort(
        (a, b) => a.localeCompare(b, "id")
      ),
    [items]
  );

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return {
      total: items.length,
      live: items.filter((p) => p.is_active).length,
      low: items.filter((p) => p.is_active && p.stock_type === "ready_stock" && availableOf(p) <= 3).length,
      po: items.filter(
        (p) => p.is_active && p.stock_type === "pre_order" && p.po_deadline && p.po_deadline >= today
      ).length,
    };
  }, [items]);

  const shown = useMemo(
    () =>
      sorted.filter((p) => {
        const passFilter =
          filter === "all" ||
          (filter === "hidden" && !p.is_active) ||
          (filter === "featured" && p.is_featured) ||
          (filter === "low" && p.stock_type === "ready_stock" && availableOf(p) <= 3) ||
          p.stock_type === filter;
        return (
          passFilter &&
          (!cat || (p.category ?? "") === cat) &&
          matchesQuery(q, p.name, p.slug, p.description, p.category ?? "")
        );
      }),
    [sorted, q, filter, cat]
  );

  /** Simpan produk + galeri + varian. Mengembalikan pesan galat atau null. */
  const handleSave = async (
    row: ProductRow,
    images: ImageRow[],
    attributes: { name: string }[],
    variants: VariantRow[]
  ): Promise<string | null> => {
    if (!(await save(stripJoined(row)))) return null; // galat tampil di DbStatus

    const supabase = getSupabase();
    if (!supabase) return "Supabase belum dikonfigurasi.";

    // Galeri: hapus yang dibuang, upsert sisanya dengan urutan baru.
    const keepIds = images.map((i) => i.id);
    const del = await supabase
      .from("product_images")
      .delete()
      .eq("product_id", row.id)
      .not("id", "in", `(${keepIds.length ? keepIds.map((i) => `"${i}"`).join(",") : "''"})`);
    if (del.error) return `Galeri gagal disimpan: ${friendlyError(del.error.message)}`;
    if (images.length) {
      const up = await supabase.from("product_images").upsert(
        images.map((img, idx) => ({
          id: img.id,
          product_id: row.id,
          url: img.url,
          alt_text: img.alt_text || row.name,
          width: img.width,
          height: img.height,
          order_index: idx,
        }))
      );
      if (up.error) return `Galeri gagal disimpan: ${friendlyError(up.error.message)}`;
    }

    // Atribut + varian lewat satu RPC supaya tidak ada baris yatim.
    const rpc = await supabase.rpc("admin_save_product_variants", {
      p_product_id: row.id,
      p_attributes: attributes,
      p_variants: variants.map((v, idx) => ({
        id: v.id,
        label: v.label,
        sku: v.sku,
        price: v.price,
        stock: v.stock,
        stock_reserved: v.stock_reserved,
        po_quota: v.po_quota,
        po_filled: v.po_filled,
        po_reserved: v.po_reserved,
        image: v.image,
        is_active: v.is_active,
        order_index: idx,
        options: v.options,
      })),
    });
    if (rpc.error) return `Varian gagal disimpan: ${friendlyError(rpc.error.message)}`;

    await reload();
    setEditing(null);
    setIsNew(false);
    return null;
  };

  const handleExportBuyers = async (p: ProductRow) => {
    setExportingId(p.id);
    await exportProductBuyers(p);
    setExportingId(null);
  };

  const quickUpdate = (p: ProductRow, patch: Partial<ProductRow>) =>
    save({ ...stripJoined(p), ...patch });

  /** Salin produk ke form baru (belum tersimpan sampai pengurus klik Simpan). */
  const duplicate = (p: ProductRow) => {
    const id = `prod-${uid()}`;
    setIsNew(true);
    setEditing({
      ...p,
      id,
      name: `${p.name} (Salinan)`,
      slug: `${p.slug}-salinan`,
      is_active: false,
      is_featured: false,
      stock_reserved: 0,
      po_filled: 0,
      po_reserved: 0,
      images: (p.images ?? []).map((img, i) => ({ ...img, id: `${id}-img-${i}-${uid()}` })),
      variants: (p.variants ?? []).map((v, i) => ({
        ...v,
        id: `${id}-var-${i}-${uid()}`,
        options: optionsOf(v),
        stock_reserved: 0,
        po_filled: 0,
        po_reserved: 0,
      })),
    });
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    const target = items.find((p) => p.id === deleteId);
    setDeleting(true);
    setActionError(null);
    const ok = await remove(deleteId);
    setDeleting(false);
    if (!ok) {
      setActionError("Produk tidak bisa dihapus. Kalau sudah pernah dipesan, sembunyikan saja dari etalase.");
      return;
    }
    setDeleteId(null);
    // Bersihkan foto yang tidak dipakai produk lain (best-effort).
    const supabase = getSupabase();
    if (target && supabase) {
      const urls = Array.from(
        new Set([
          ...(target.images ?? []).map((i) => i.url),
          ...(target.variants ?? []).map((v) => v.image ?? ""),
        ].filter(Boolean))
      );
      for (const url of urls) {
        const [a, b] = await Promise.all([
          supabase.from("product_images").select("id", { count: "exact", head: true }).eq("url", url),
          supabase.from("product_variants").select("id", { count: "exact", head: true }).eq("image", url),
        ]);
        if (!a.error && !b.error && (a.count ?? 0) + (b.count ?? 0) === 0) {
          await removeContentImage(url);
        }
      }
    }
  };

  const filterChips: { key: Filter; label: string; count?: number }[] = [
    { key: "all", label: "Semua", count: stats.total },
    { key: "ready_stock", label: "Ready stock" },
    { key: "pre_order", label: "Pre-order" },
    { key: "featured", label: "Unggulan" },
    { key: "low", label: "Stok menipis", count: stats.low },
    { key: "hidden", label: "Disembunyikan", count: stats.total - stats.live },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="mt-1 text-sm text-gray-500">
            Kelola merchandise HMTL UNTAN: foto, harga, stok, dan varian.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DbStatus live={live} loading={loading} error={error} saving={saving} />
          <button
            onClick={() => {
              setIsNew(true);
              setEditing(blankProduct());
            }}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      {/* Ringkasan */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total produk", value: stats.total },
          { label: "Tayang di etalase", value: stats.live },
          { label: "Pre-order dibuka", value: stats.po },
          { label: "Stok menipis (≤3)", value: stats.low, warn: stats.low > 0 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3">
            <div className="text-xs text-gray-500">{s.label}</div>
            <div className={`mt-0.5 text-xl font-bold tabular-nums ${s.warn ? "text-amber-700" : "text-gray-900"}`}>
              {loading ? "–" : s.value}
            </div>
          </div>
        ))}
      </div>

      <AdminSearch
        value={q}
        onChange={setQ}
        placeholder="Cari nama, slug, atau kategori…"
        total={items.length}
        shown={shown.length}
      >
        {categories.length > 0 && (
          <select
            value={cat}
            onChange={(e) => setCat(e.target.value)}
            aria-label="Filter kategori"
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-emerald-500"
          >
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
      </AdminSearch>

      <div className="-mt-1 mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Saring produk">
        {filterChips.map((c) => (
          <button
            key={c.key}
            role="tab"
            aria-selected={filter === c.key}
            onClick={() => setFilter(c.key)}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
              filter === c.key
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {c.label}
            {c.count != null && c.count > 0 && (
              <span className={filter === c.key ? "text-emerald-100" : "text-gray-400"}>{c.count}</span>
            )}
          </button>
        ))}
      </div>

      {actionError && (
        <div role="alert" className="mb-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="flex-1">{actionError}</span>
          <button onClick={() => setActionError(null)} aria-label="Tutup" className="text-red-400 hover:text-red-600">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!loading && shown.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
          <p className="text-sm text-gray-500">
            {items.length === 0 ? "Belum ada produk. Mulai dengan menambah produk pertama." : "Tidak ada produk yang cocok."}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => {
                setIsNew(true);
                setEditing(blankProduct());
              }}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Tambah Produk
            </button>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <ul className="grid gap-3">
          {shown.map((p) => {
            const variantCount = (p.variants ?? []).length;
            const available = availableOf(p);
            const cover = p.images?.find((i) => i.url)?.url;
            const today = new Date().toISOString().slice(0, 10);
            const poOpen = p.stock_type === "pre_order" && !!p.po_deadline && p.po_deadline >= today;
            const discount =
              p.compare_at_price && p.compare_at_price > p.price
                ? Math.round(((p.compare_at_price - p.price) / p.compare_at_price) * 100)
                : null;

            return (
              <li
                key={p.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:p-4 ${
                  p.is_active ? "border-gray-200" : "border-dashed border-gray-300 bg-gray-50/60"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-gray-100 text-gray-300">
                    {cover ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={cover} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ImagePlus className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.is_featured && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" aria-label="Unggulan" />}
                      <span className="font-semibold leading-snug text-gray-900 [overflow-wrap:anywhere]">{p.name}</span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500">
                      <span className="font-medium text-gray-900">{formatPrice(p.price)}</span>
                      {discount && (
                        <>
                          <span className="text-gray-400 line-through">{formatPrice(p.compare_at_price!)}</span>
                          <span className="font-medium text-red-700">−{discount}%</span>
                        </>
                      )}
                      {p.category && <span>· {p.category}</span>}
                      {variantCount > 0 && <span>· {variantCount} varian</span>}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          p.stock_type === "pre_order" ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"
                        }`}
                      >
                        {p.stock_type === "pre_order" ? (poOpen ? "PO dibuka" : "PO ditutup") : "Ready stock"}
                      </span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${
                          available === 0
                            ? "bg-red-50 text-red-700"
                            : available <= 3 && p.stock_type === "ready_stock"
                              ? "bg-amber-50 text-amber-800"
                              : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {available === 0 ? "Habis" : `${available} tersedia`}
                      </span>
                      {!p.is_active && (
                        <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[11px] font-medium text-gray-600">
                          Disembunyikan
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-0.5 border-t border-gray-100 pt-2 sm:border-0 sm:pt-0">
                  <IconBtn
                    label={p.is_featured ? "Lepas dari unggulan" : "Jadikan unggulan"}
                    onClick={() => quickUpdate(p, { is_featured: !p.is_featured })}
                    active={!!p.is_featured}
                  >
                    <Star className={`h-4 w-4 ${p.is_featured ? "fill-amber-400 text-amber-500" : ""}`} />
                  </IconBtn>
                  <IconBtn
                    label={p.is_active ? "Sembunyikan dari etalase" : "Tampilkan di etalase"}
                    onClick={() => quickUpdate(p, { is_active: !p.is_active })}
                  >
                    {p.is_active ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </IconBtn>
                  <IconBtn label="Duplikat produk" onClick={() => duplicate(p)}>
                    <Copy className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn
                    label="Export daftar pembeli ke Excel"
                    onClick={() => handleExportBuyers(p)}
                    disabled={exportingId === p.id}
                  >
                    {exportingId === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                  </IconBtn>
                  {p.is_active && (
                    <Link
                      href={`/merchandise/${p.slug}`}
                      target="_blank"
                      title="Lihat di website"
                      aria-label="Lihat di website"
                      className="grid h-10 w-10 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                  <IconBtn
                    label="Edit produk"
                    onClick={() => {
                      setIsNew(false);
                      setEditing(p);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Hapus produk" danger onClick={() => setDeleteId(p.id)}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ProductModal
          product={editing}
          isNew={isNew}
          categories={categories}
          takenSlugs={items.filter((p) => p.id !== editing.id).map((p) => p.slug)}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            setIsNew(false);
          }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <Trash2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h3 className="mb-1 font-bold text-gray-900">Hapus produk?</h3>
            <p className="mb-2 text-sm text-gray-500">
              {items.find((p) => p.id === deleteId)?.name} hilang dari etalase secara permanen, beserta
              foto dan variannya.
            </p>
            <p className="mb-5 rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
              Produk yang pernah dipesan tidak bisa dihapus karena pesanan lama masih merujuk padanya.
              Untuk produk seperti itu, pakai tombol mata untuk menyembunyikannya.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                disabled={deleting}
                className="min-h-10 rounded-lg px-4 text-sm text-gray-600 hover:bg-gray-100"
              >
                Batal
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-red-600 px-4 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({
  label,
  onClick,
  children,
  disabled,
  danger,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-10 w-10 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-60 ${
        danger ? "hover:text-red-600" : "hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

/** Semua kombinasi nilai atribut, mis. [Hitam,Putih]×[M,L] → 4 baris. */
function cartesian(attrs: { name: string; values: string[] }[]): Record<string, string>[] {
  return attrs.reduce<Record<string, string>[]>(
    (acc, a) => acc.flatMap((combo) => a.values.map((v) => ({ ...combo, [a.name]: v }))),
    [{}]
  );
}

function parseAttrs(rows: AttrDraft[]): { name: string; values: string[] }[] {
  return rows
    .map((r) => ({
      name: r.name.trim(),
      values: Array.from(new Set(r.values.split(",").map((v) => v.trim()).filter(Boolean))),
    }))
    .filter((r) => r.name && r.values.length);
}

const comboKey = (names: string[], options: Record<string, string>) =>
  names.map((n) => (options[n] ?? "").trim().toLowerCase()).join("\u0001");

function ProductModal({
  product,
  isNew,
  categories,
  takenSlugs,
  onSave,
  onClose,
}: {
  product: ProductRow;
  isNew: boolean;
  categories: string[];
  takenSlugs: string[];
  onSave: (
    p: ProductRow,
    images: ImageRow[],
    attributes: { name: string }[],
    variants: VariantRow[]
  ) => Promise<string | null>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductRow>(() => ({
    ...product,
    category: product.category ?? "",
    size_chart: product.size_chart ?? "",
  }));
  const [images, setImages] = useState<ImageRow[]>(() =>
    [...(product.images ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((i, idx) => ({ ...i, order_index: idx }))
  );

  const initialVariants = useMemo<VariantRow[]>(
    () =>
      [...(product.variants ?? [])]
        .sort((a, b) => a.order_index - b.order_index)
        .map((v) => ({
          id: v.id,
          label: v.label,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          stock_reserved: v.stock_reserved,
          po_quota: v.po_quota,
          po_filled: v.po_filled,
          po_reserved: v.po_reserved,
          image: v.image,
          is_active: v.is_active,
          order_index: v.order_index,
          options: optionsOf(v),
        })),
    [product]
  );

  // Produk lama dengan "pilihan sederhana" (variant_options) dialihkan ke
  // pembuat varian supaya hanya ada satu cara mengelola pilihan.
  const legacy =
    (product.attributes ?? []).length === 0 && (product.variant_options ?? []).length > 0;

  const [attrRows, setAttrRows] = useState<AttrDraft[]>(() => {
    if (legacy) {
      return [{ name: product.variant_name || "Ukuran", values: (product.variant_options ?? []).join(", ") }];
    }
    return [...(product.attributes ?? [])]
      .sort((a, b) => a.order_index - b.order_index)
      .map((a) => ({
        name: a.name,
        values: Array.from(
          new Set(initialVariants.map((v) => v.options[a.name]).filter(Boolean))
        ).join(", "),
      }));
  });
  const [variants, setVariants] = useState<VariantRow[]>(initialVariants);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(
    !!(product.size_chart || product.weight_grams || product.max_per_order || product.order_index)
  );
  const dialogRef = useRef<HTMLFormElement>(null);

  const snapshot = JSON.stringify({ form, images, attrRows, variants });
  const [initialSnapshot] = useState(snapshot);
  const dirty = snapshot !== initialSnapshot;

  const requestClose = () => {
    if (saving) return;
    if (dirty && !window.confirm("Perubahan belum disimpan. Tutup tanpa menyimpan?")) return;
    onClose();
  };
  const closeRef = useRef(requestClose);
  // Selalu pakai versi requestClose terbaru di listener Esc.
  useEffect(() => {
    closeRef.current = requestClose;
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
    };
    window.addEventListener("keydown", onKey);
    dialogRef.current?.querySelector<HTMLInputElement>("input")?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, []);

  const set = <K extends keyof ProductRow>(k: K, v: ProductRow[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const field =
    "w-full min-h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";
  const pre = form.stock_type === "pre_order";

  const parsed = parseAttrs(attrRows);
  const attrNames = parsed.map((a) => a.name);
  const usesVariants = parsed.length > 0;

  /** Susun ulang daftar varian dari atribut, mempertahankan stok/harga lama. */
  const buildVariants = (current: VariantRow[]): VariantRow[] => {
    if (!usesVariants) return [];
    const byKey = new Map(current.map((v) => [comboKey(attrNames, v.options), v]));
    return cartesian(parsed).map((options, idx) => {
      const old = byKey.get(comboKey(attrNames, options));
      const label = attrNames.map((n) => options[n]).join(" / ");
      if (old) return { ...old, options, label, order_index: idx };
      return {
        id: `${form.id}-var-${uid()}`,
        label,
        sku: null,
        price: null,
        stock: 0,
        stock_reserved: 0,
        po_quota: pre ? 0 : null,
        po_filled: 0,
        po_reserved: 0,
        image: null,
        is_active: true,
        order_index: idx,
        options,
      };
    });
  };

  const synced = buildVariants(variants);
  const outOfSync =
    usesVariants &&
    (synced.length !== variants.length ||
      synced.some((v, i) => comboKey(attrNames, v.options) !== comboKey(attrNames, variants[i]?.options ?? {})));

  const updateVariant = <K extends keyof VariantRow>(id: string, key: K, value: VariantRow[K]) =>
    setVariants((p) => p.map((v) => (v.id === id ? { ...v, [key]: value } : v)));

  const applyBulk = () => {
    setVariants((p) =>
      p.map((v) => ({
        ...v,
        ...(bulkPrice !== "" ? { price: Number(bulkPrice) || null } : {}),
        ...(bulkStock !== ""
          ? pre
            ? { po_quota: Math.max(0, Number(bulkStock) || 0) }
            : { stock: Math.max(0, Number(bulkStock) || 0) }
          : {}),
      }))
    );
    setBulkPrice("");
    setBulkStock("");
  };

  const moveImage = (idx: number, dir: -1 | 1) =>
    setImages((p) => {
      const next = [...p];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return p;
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });

  const discount =
    form.compare_at_price && form.compare_at_price > form.price
      ? Math.round(((form.compare_at_price - form.price) / form.compare_at_price) * 100)
      : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const name = form.name.trim();
    const slug = slugifyName(form.slug || name);
    const finalVariants = buildVariants(variants);

    const problems: string[] = [];
    if (!name) problems.push("Nama produk wajib diisi.");
    if (!slug) problems.push("Slug tidak valid. Pakai huruf, angka, dan tanda hubung.");
    if (takenSlugs.includes(slug)) problems.push(`Slug "${slug}" sudah dipakai produk lain.`);
    if (!(form.price > 0)) problems.push("Harga harus lebih dari 0.");
    if (form.compare_at_price != null && form.compare_at_price > 0 && form.compare_at_price <= form.price) {
      problems.push("Harga coret harus lebih besar dari harga jual, atau kosongkan.");
    }
    if (pre && !form.po_deadline) problems.push("Pre-order butuh tanggal tenggat.");
    if (pre && !usesVariants && !(form.po_quota && form.po_quota > 0)) {
      problems.push("Kuota pre-order harus lebih dari 0.");
    }
    if (attrRows.some((r) => r.name.trim() && !r.values.trim())) {
      problems.push("Setiap atribut varian butuh minimal satu nilai (pisahkan dengan koma).");
    }
    if (attrRows.some((r) => !r.name.trim() && r.values.trim())) {
      problems.push("Isi nama atribut varian (mis. Ukuran) untuk nilai yang sudah diketik.");
    }
    if (new Set(attrNames.map((n) => n.toLowerCase())).size !== attrNames.length) {
      problems.push("Nama atribut varian tidak boleh kembar.");
    }
    if (usesVariants && finalVariants.every((v) => !v.is_active)) {
      problems.push("Minimal satu varian harus aktif.");
    }
    if (problems.length) {
      setFormError(problems.join(" "));
      dialogRef.current?.querySelector("[data-scroll]")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setSaving(true);
    const err = await onSave(
      {
        ...form,
        name,
        slug,
        description: form.description.trim(),
        category: (form.category ?? "").trim(),
        size_chart: (form.size_chart ?? "").trim(),
        compare_at_price: form.compare_at_price && form.compare_at_price > 0 ? form.compare_at_price : null,
        // Pilihan sederhana lama selalu dikosongkan: semua pilihan kini lewat varian.
        variant_options: null,
        variant_name: null,
        po_quota: pre ? (usesVariants ? null : form.po_quota) : null,
        po_deadline: pre ? form.po_deadline : null,
      },
      images.map((img, idx) => ({ ...img, order_index: idx })),
      parsed.map((a) => ({ name: a.name })),
      finalVariants
    );
    setSaving(false);
    if (err) setFormError(err);
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/40 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <form
        ref={dialogRef}
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-modal-title"
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-3xl sm:rounded-2xl"
        noValidate
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h3 id="product-modal-title" className="truncate text-lg font-bold text-gray-900">
            {isNew ? "Produk baru" : `Edit: ${product.name}`}
          </h3>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Tutup"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div data-scroll className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-5 py-5">
          {formError && (
            <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* 1. Info dasar */}
          <Section title="Info produk">
            <div>
              <label htmlFor="pm-name" className={labelCls}>Nama produk</label>
              <input
                id="pm-name"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                maxLength={120}
                placeholder="Kaos Angkatan HMTL 2026"
                className={field}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pm-cat" className={labelCls}>Kategori</label>
                <input
                  id="pm-cat"
                  list="pm-cat-list"
                  value={form.category ?? ""}
                  onChange={(e) => set("category", e.target.value)}
                  maxLength={40}
                  placeholder="Kaos, Jaket, Aksesoris…"
                  className={field}
                />
                <datalist id="pm-cat-list">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="pm-slug" className={labelCls}>Alamat halaman</label>
                <div className="flex min-h-11 items-center rounded-lg border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200">
                  <span className="pl-3 text-sm text-gray-400">/merchandise/</span>
                  <input
                    id="pm-slug"
                    value={form.slug}
                    onChange={(e) => set("slug", e.target.value)}
                    placeholder={slugifyName(form.name) || "otomatis"}
                    className="min-w-0 flex-1 bg-transparent py-2 pr-3 font-mono text-sm outline-none"
                  />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="pm-desc" className={labelCls}>Deskripsi</label>
              <textarea
                id="pm-desc"
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                rows={4}
                placeholder="Bahan, sablon, ukuran, dan informasi lain yang perlu pembeli tahu."
                className={`${field} resize-y py-2.5`}
              />
            </div>
          </Section>

          {/* 2. Foto */}
          <Section
            title="Foto"
            hint="Foto pertama jadi sampul di etalase. Geser urutan dengan tombol panah. Rasio asli foto dipertahankan."
          >
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {images.map((img, idx) => (
                <div key={img.id} className="group relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt_text}
                    className="aspect-square w-full rounded-lg border border-gray-200 bg-gray-50 object-contain"
                  />
                  {idx === 0 && (
                    <span className="absolute left-1 top-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Sampul
                    </span>
                  )}
                  <div className="mt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => moveImage(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Geser ke kiri"
                      className="grid h-8 w-8 place-items-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setImages((p) => p.filter((_, i) => i !== idx))}
                      aria-label="Hapus foto"
                      className="grid h-8 w-8 place-items-center rounded text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveImage(idx, 1)}
                      disabled={idx === images.length - 1}
                      aria-label="Geser ke kanan"
                      className="grid h-8 w-8 place-items-center rounded text-gray-500 hover:bg-gray-100 disabled:opacity-30"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              {images.length < 10 && (
                <div>
                  <ImageUpload
                    label=""
                    value=""
                    aspect="square"
                    onChange={(url, dims) => {
                      if (!url) return;
                      setImages((p) =>
                        p.some((i) => i.url === url)
                          ? p
                          : [
                              ...p,
                              {
                                id: `${form.id}-img-${uid()}`,
                                url,
                                alt_text: form.name,
                                width: dims?.width ?? null,
                                height: dims?.height ?? null,
                                order_index: p.length,
                              },
                            ]
                      );
                    }}
                  />
                </div>
              )}
            </div>
          </Section>

          {/* 3. Harga & penjualan */}
          <Section title="Harga & penjualan">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="pm-price" className={labelCls}>Harga jual (Rp)</label>
                <input
                  id="pm-price"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  value={form.price || ""}
                  onChange={(e) => set("price", Math.max(0, Number(e.target.value) || 0))}
                  placeholder="85000"
                  className={field}
                />
              </div>
              <div>
                <label htmlFor="pm-compare" className={labelCls}>
                  Harga coret (Rp) <span className="font-normal text-gray-400">· opsional</span>
                </label>
                <input
                  id="pm-compare"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={500}
                  value={form.compare_at_price ?? ""}
                  onChange={(e) => set("compare_at_price", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                  placeholder="Harga sebelum diskon"
                  className={field}
                />
                {discount && <p className="mt-1 text-xs text-emerald-700">Tampil sebagai diskon {discount}%.</p>}
              </div>
            </div>

            <div>
              <span className={labelCls}>Cara jual</span>
              <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Cara jual">
                {(
                  [
                    ["ready_stock", "Ready stock", "Barang sudah ada, langsung dikirim."],
                    ["pre_order", "Pre-order", "Dipesan dulu, diproduksi setelah tenggat."],
                  ] as const
                ).map(([val, title, desc]) => (
                  <button
                    key={val}
                    type="button"
                    role="radio"
                    aria-checked={form.stock_type === val}
                    onClick={() => set("stock_type", val)}
                    className={`rounded-lg border p-3 text-left transition-colors ${
                      form.stock_type === val
                        ? "border-emerald-600 bg-emerald-50 ring-1 ring-emerald-600"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="text-sm font-semibold text-gray-900">{title}</div>
                    <div className="mt-0.5 text-xs leading-snug text-gray-500">{desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {pre && (
                <div>
                  <label htmlFor="pm-deadline" className={labelCls}>Tenggat pre-order</label>
                  <input
                    id="pm-deadline"
                    type="date"
                    value={form.po_deadline ?? ""}
                    onChange={(e) => set("po_deadline", e.target.value || null)}
                    className={field}
                  />
                </div>
              )}
              {!usesVariants && (
                <div>
                  <label htmlFor="pm-stock" className={labelCls}>{pre ? "Kuota pre-order" : "Jumlah stok"}</label>
                  <input
                    id="pm-stock"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={pre ? form.po_quota ?? "" : form.stock}
                    onChange={(e) => {
                      const n = Math.max(0, Number(e.target.value) || 0);
                      if (pre) set("po_quota", n);
                      else set("stock", n);
                    }}
                    className={field}
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {pre
                      ? `${form.po_filled ?? 0} terisi, ${form.po_reserved ?? 0} ditahan pesanan baru.`
                      : `${form.stock_reserved} sedang ditahan pesanan yang belum dikonfirmasi.`}
                  </p>
                </div>
              )}
            </div>
          </Section>

          {/* 4. Varian */}
          <Section
            title="Varian"
            hint="Kosongkan bila produk tidak punya pilihan. Contoh: Ukuran = S, M, L, XL; Warna = Hitam, Putih. Kombinasi dibuat otomatis, masing-masing punya stok sendiri."
          >
            {legacy && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Produk ini sebelumnya memakai pilihan dengan stok bersama. Sekarang tiap pilihan
                  punya stok sendiri — isi stok tiap varian di tabel bawah sebelum menyimpan.
                </span>
              </div>
            )}

            <div className="space-y-2">
              {attrRows.map((row, idx) => (
                <div key={idx} className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={row.name}
                    onChange={(e) =>
                      setAttrRows((p) => p.map((r, i) => (i === idx ? { ...r, name: e.target.value } : r)))
                    }
                    placeholder="Nama, mis. Ukuran"
                    aria-label={`Nama atribut ${idx + 1}`}
                    maxLength={40}
                    className={`${field} sm:w-40`}
                  />
                  <div className="flex flex-1 gap-2">
                    <input
                      value={row.values}
                      onChange={(e) =>
                        setAttrRows((p) => p.map((r, i) => (i === idx ? { ...r, values: e.target.value } : r)))
                      }
                      placeholder="Nilai, pisahkan dengan koma: S, M, L, XL"
                      aria-label={`Nilai atribut ${idx + 1}`}
                      className={field}
                    />
                    <button
                      type="button"
                      onClick={() => setAttrRows((p) => p.filter((_, i) => i !== idx))}
                      aria-label="Hapus atribut"
                      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-gray-200 text-gray-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                {attrRows.length < 3 && (
                  <button
                    type="button"
                    onClick={() =>
                      setAttrRows((p) => [
                        ...p,
                        p.length === 0 ? { name: "Ukuran", values: "S, M, L, XL" } : { name: "", values: "" },
                      ])
                    }
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-dashed border-gray-300 px-3 text-sm font-medium text-gray-700 hover:border-emerald-500 hover:text-emerald-700"
                  >
                    <Plus className="h-4 w-4" />
                    {attrRows.length === 0 ? "Tambah varian" : "Tambah atribut"}
                  </button>
                )}
                {outOfSync && (
                  <button
                    type="button"
                    onClick={() => setVariants(buildVariants(variants))}
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
                  >
                    <WandSparkles className="h-4 w-4" />
                    Perbarui kombinasi ({synced.length})
                  </button>
                )}
              </div>
            </div>

            {usesVariants && variants.length > 0 && (
              <>
                <div className="flex flex-wrap items-end gap-2 rounded-lg bg-gray-50 p-3">
                  <div className="text-xs font-medium text-gray-600 basis-full">Isi cepat semua varian</div>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={bulkPrice}
                    onChange={(e) => setBulkPrice(e.target.value)}
                    placeholder="Harga"
                    aria-label="Harga untuk semua varian"
                    className="min-h-10 w-28 rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={bulkStock}
                    onChange={(e) => setBulkStock(e.target.value)}
                    placeholder={pre ? "Kuota" : "Stok"}
                    aria-label={pre ? "Kuota untuk semua varian" : "Stok untuk semua varian"}
                    className="min-h-10 w-24 rounded-lg border border-gray-200 bg-white px-2 text-sm outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={applyBulk}
                    disabled={bulkPrice === "" && bulkStock === ""}
                    className="min-h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-800 hover:bg-gray-100 disabled:opacity-50"
                  >
                    Terapkan
                  </button>
                </div>

                <div className="overflow-hidden rounded-lg border border-gray-200">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs text-gray-500">
                          <th className="px-3 py-2 font-medium">Varian</th>
                          <th className="px-2 py-2 font-medium">Harga</th>
                          <th className="px-2 py-2 font-medium">{pre ? "Kuota" : "Stok"}</th>
                          <th className="px-2 py-2 font-medium">SKU</th>
                          <th className="px-2 py-2 text-center font-medium">Aktif</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {variants.map((v) => (
                          <tr key={v.id} className={v.is_active ? "" : "bg-gray-50 text-gray-400"}>
                            <td className="whitespace-nowrap px-3 py-1.5 font-medium">{v.label}</td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={v.price ?? ""}
                                placeholder={String(form.price || "")}
                                onChange={(e) =>
                                  updateVariant(v.id, "price", e.target.value ? Math.max(0, Number(e.target.value)) : null)
                                }
                                aria-label={`Harga ${v.label}`}
                                className="min-h-9 w-24 rounded border border-gray-200 px-2 outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                type="number"
                                inputMode="numeric"
                                min={0}
                                value={pre ? v.po_quota ?? 0 : v.stock}
                                onChange={(e) =>
                                  updateVariant(
                                    v.id,
                                    pre ? "po_quota" : "stock",
                                    Math.max(0, Number(e.target.value) || 0)
                                  )
                                }
                                aria-label={`${pre ? "Kuota" : "Stok"} ${v.label}`}
                                className="min-h-9 w-20 rounded border border-gray-200 px-2 outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5">
                              <input
                                value={v.sku ?? ""}
                                onChange={(e) => updateVariant(v.id, "sku", e.target.value || null)}
                                aria-label={`SKU ${v.label}`}
                                className="min-h-9 w-24 rounded border border-gray-200 px-2 font-mono text-xs outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="px-2 py-1.5 text-center">
                              <input
                                type="checkbox"
                                checked={v.is_active}
                                onChange={(e) => updateVariant(v.id, "is_active", e.target.checked)}
                                aria-label={`Varian ${v.label} aktif`}
                                className="h-4 w-4 rounded border-gray-300 accent-emerald-600"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Harga kosong = ikut harga jual. Matikan &quot;Aktif&quot; untuk kombinasi yang tidak dijual,
                  tanpa menghapus riwayat pesanannya.
                </p>
              </>
            )}
          </Section>

          {/* 5. Tampilan & lainnya */}
          <Section title="Tampilan di etalase">
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle
                checked={form.is_active}
                onChange={(v) => set("is_active", v)}
                title="Tayang"
                desc="Tampil di etalase dan bisa dipesan."
              />
              <Toggle
                checked={!!form.is_featured}
                onChange={(v) => set("is_featured", v)}
                title="Unggulan"
                desc="Ditaruh paling depan di beranda dan etalase."
              />
            </div>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              aria-expanded={showMore}
              className="text-sm font-medium text-emerald-700 hover:underline"
            >
              {showMore ? "Sembunyikan pengaturan lanjutan" : "Pengaturan lanjutan (panduan ukuran, berat, batas beli)"}
            </button>

            {showMore && (
              <div className="space-y-4">
                <div>
                  <label htmlFor="pm-size" className={labelCls}>Panduan ukuran</label>
                  <textarea
                    id="pm-size"
                    value={form.size_chart ?? ""}
                    onChange={(e) => set("size_chart", e.target.value)}
                    rows={4}
                    placeholder={"Satu baris per ukuran, mis.\nS — lebar 48 cm, panjang 68 cm\nM — lebar 50 cm, panjang 70 cm"}
                    className={`${field} resize-y py-2.5 font-mono text-xs`}
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="pm-weight" className={labelCls}>Berat (gram)</label>
                    <input
                      id="pm-weight"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={form.weight_grams ?? ""}
                      onChange={(e) => set("weight_grams", e.target.value ? Math.max(0, Number(e.target.value)) : null)}
                      className={field}
                    />
                  </div>
                  <div>
                    <label htmlFor="pm-max" className={labelCls}>Maks. per pesanan</label>
                    <input
                      id="pm-max"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      value={form.max_per_order ?? ""}
                      onChange={(e) => set("max_per_order", e.target.value ? Math.max(1, Number(e.target.value)) : null)}
                      placeholder="Tanpa batas"
                      className={field}
                    />
                  </div>
                  <div>
                    <label htmlFor="pm-order" className={labelCls}>Urutan</label>
                    <input
                      id="pm-order"
                      type="number"
                      inputMode="numeric"
                      value={form.order_index ?? 0}
                      onChange={(e) => set("order_index", Number(e.target.value) || 0)}
                      className={field}
                    />
                    <p className="mt-1 text-xs text-gray-500">Kecil tampil lebih dulu.</p>
                  </div>
                </div>
              </div>
            )}

            {!isNew && (
              <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Mengubah harga tidak memengaruhi pesanan lama — harga sudah disalin ke pesanan saat dibuat.</span>
              </div>
            )}
          </Section>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-gray-100 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={requestClose}
            disabled={saving}
            className="min-h-11 min-w-20 rounded-lg border border-gray-300 px-4 text-sm font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex min-h-11 min-w-24 items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saving ? "Menyimpan…" : isNew ? "Simpan produk" : "Simpan perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wide text-gray-900">{title}</h4>
        {hint && <p className="mt-1 text-xs leading-relaxed text-gray-500">{hint}</p>}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-emerald-600"
      />
      <span>
        <span className="block text-sm font-medium text-gray-900">{title}</span>
        <span className="block text-xs text-gray-500">{desc}</span>
      </span>
    </label>
  );
}
