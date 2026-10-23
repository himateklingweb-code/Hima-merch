"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import {
  Plus,
  Pencil,
  Eye,
  Trash2,
  X,
  AlertTriangle,
  FileDown,
  Loader2,
  GripVertical,
  ImagePlus,
} from "lucide-react";
import { formatPrice, slugifyName } from "@/data/products";
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
  images?: ImageRow[];
  attributes?: { name: string; order_index: number }[];
  variants?: (VariantRow & { options?: { attribute_name: string; value: string }[] })[];
}

function blankProduct(): ProductRow {
  return {
    id: `prod-${Date.now()}`,
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
    images: [],
    attributes: [],
    variants: [],
  };
}

const PRODUCT_SELECT =
  "*, images:product_images(id, url, alt_text, width, height, order_index), attributes:product_attributes(name, order_index), variants:product_variants(*, options:product_variant_options(attribute_name, value))";

export default function AdminProdukPage() {
  const { items, loading, live, error, saving, save, remove } =
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
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "ready_stock" | "pre_order" | "hidden">("all");

  const shown = useMemo(
    () =>
      items.filter(
        (p) =>
          (typeFilter === "all" ||
            (typeFilter === "hidden" ? !p.is_active : p.stock_type === typeFilter)) &&
          matchesQuery(q, p.name, p.slug, p.description)
      ),
    [items, q, typeFilter]
  );

  const handleSave = async (
    row: ProductRow,
    images: ImageRow[],
    attributes: { name: string }[],
    variants: VariantRow[]
  ) => {
    // `row` may carry the nested images/attributes/variants arrays picked up
    // from the joined read (PRODUCT_SELECT) -- those are not real columns on
    // `products`, so they must never reach the upsert below.
    const { images: _i, attributes: _a, variants: _v, ...columns } = row;
    if (!(await save(columns as ProductRow))) return;

    const supabase = getSupabase();
    if (supabase) {
      // Gallery is a plain child table -- upsert by id, drop whatever got removed.
      const keepIds = images.map((i) => i.id);
      await supabase
        .from("product_images")
        .delete()
        .eq("product_id", row.id)
        .not("id", "in", `(${keepIds.length ? keepIds.map((i) => `"${i}"`).join(",") : "''"})`);
      if (images.length) {
        await supabase.from("product_images").upsert(
          images.map((img, idx) => ({
            id: img.id,
            product_id: row.id,
            url: img.url,
            alt_text: img.alt_text,
            width: img.width,
            height: img.height,
            order_index: idx,
          }))
        );
      }

      // Attributes + variants go through one RPC so a partial failure
      // can't leave orphaned rows behind.
      await supabase.rpc("admin_save_product_variants", {
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
    }

    setEditing(null);
    setIsNew(false);
  };

  const handleExportBuyers = async (p: ProductRow) => {
    setExportingId(p.id);
    await exportProductBuyers(p);
    setExportingId(null);
  };

  const toggleActive = async (p: ProductRow) => {
    const { images: _i, attributes: _a, variants: _v, ...columns } = p;
    return save({ ...(columns as ProductRow), is_active: !p.is_active });
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produk</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola merchandise HMTL UNTAN
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DbStatus live={live} loading={loading} error={error} saving={saving} />
          <button
            onClick={() => {
              setIsNew(true);
              setEditing(blankProduct());
            }}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Produk
          </button>
        </div>
      </div>

      <AdminSearch
        value={q}
        onChange={setQ}
        placeholder="Cari nama atau slug produk..."
        total={items.length}
        shown={shown.length}
      >
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as typeof typeFilter)}
          aria-label="Filter tipe produk"
          className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-emerald-500"
        >
          <option value="all">Semua tipe</option>
          <option value="ready_stock">Ready stock</option>
          <option value="pre_order">Pre-order</option>
          <option value="hidden">Disembunyikan</option>
        </select>
      </AdminSearch>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Produk</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Harga</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Tipe</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Stok</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Status</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    {items.length === 0 ? "Belum ada produk." : "Tidak ada produk yang cocok."}
                  </td>
                </tr>
              )}

              {shown.map((p) => {
                const variantCount = p.variants?.length ?? 0;
                const available =
                  variantCount > 0
                    ? (p.variants ?? []).reduce(
                        (sum, v) =>
                          sum +
                          (p.stock_type === "ready_stock"
                            ? v.stock - v.stock_reserved
                            : (v.po_quota ?? 0) - (v.po_filled ?? 0) - (v.po_reserved ?? 0)),
                        0
                      )
                    : p.stock_type === "ready_stock"
                      ? p.stock - p.stock_reserved
                      : (p.po_quota ?? 0) - (p.po_filled ?? 0) - (p.po_reserved ?? 0);
                const cover = p.images?.find((i) => i.url)?.url;

                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-gray-100 overflow-hidden grid place-items-center text-gray-300">
                          {cover ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={cover} alt={p.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImagePlus className="w-4 h-4" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{p.name}</div>
                          <div className="text-xs text-gray-400">
                            /{p.slug}
                            {variantCount > 0 && ` . ${variantCount} varian`}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 font-medium text-gray-900">
                      {formatPrice(p.price)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded ${
                          p.stock_type === "pre_order"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-emerald-50 text-emerald-700"
                        }`}
                      >
                        {p.stock_type === "pre_order" ? "Pre-Order" : "Ready"}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="text-gray-700">{available} tersedia</div>
                    </td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => toggleActive(p)}
                        className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                          p.is_active
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {p.is_active ? "Tayang" : "Disembunyikan"}
                      </button>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleExportBuyers(p)}
                          disabled={exportingId === p.id}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-emerald-700 disabled:opacity-60 transition-colors"
                          title="Export daftar pembeli produk ini ke Excel"
                        >
                          {exportingId === p.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </button>
                        <Link
                          href={`/merchandise/${p.slug}`}
                          target="_blank"
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Lihat di website"
                        >
                          <Eye className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => {
                            setIsNew(false);
                            setEditing(p);
                          }}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteId(p.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <ProductModal
          product={editing}
          isNew={isNew}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
            setIsNew(false);
          }}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Hapus Produk?</h3>
            <p className="text-sm text-gray-500 mb-2">
              Produk hilang dari etalase secara permanen.
            </p>
            <p className="text-xs text-amber-700 bg-amber-50 rounded-lg p-2 mb-5">
              Kalau produk ini pernah dipesan, hapus akan ditolak karena
              pesanan lama masih merujuk padanya. Pakai
              &quot;Disembunyikan&quot; saja.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  if (await remove(deleteId)) setDeleteId(null);
                }}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ProductModal({
  product,
  isNew,
  onSave,
  onClose,
}: {
  product: ProductRow;
  isNew: boolean;
  onSave: (
    p: ProductRow,
    images: ImageRow[],
    attributes: { name: string }[],
    variants: VariantRow[]
  ) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductRow>({ ...product });
  const [variantText, setVariantText] = useState(
    (product.variant_options ?? []).join(", ")
  );
  const [images, setImages] = useState<ImageRow[]>(
    (product.images ?? []).map((i, idx) => ({ ...i, order_index: idx }))
  );
  const [attrNames, setAttrNames] = useState<string[]>(
    (product.attributes ?? []).map((a) => a.name)
  );
  const [variants, setVariants] = useState<VariantRow[]>(
    (product.variants ?? []).map((v) => ({
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
      options: Object.fromEntries(
        (v.options ?? []).map((o) => [o.attribute_name, o.value])
      ),
    }))
  );
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof ProductRow>(k: K, v: ProductRow[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const field =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm";

  const usesAttrs = attrNames.filter((n) => n.trim()).length > 0;

  const addAttribute = () => setAttrNames((p) => [...p, ""]);
  const renameAttribute = (idx: number, name: string) => {
    const old = attrNames[idx];
    setAttrNames((p) => p.map((n, i) => (i === idx ? name : n)));
    // Carry existing picks over to the renamed axis so values aren't lost.
    setVariants((p) =>
      p.map((v) => {
        if (!(old in v.options)) return v;
        const { [old]: val, ...rest } = v.options;
        return { ...v, options: { ...rest, [name]: val } };
      })
    );
  };
  const removeAttribute = (idx: number) => {
    const name = attrNames[idx];
    setAttrNames((p) => p.filter((_, i) => i !== idx));
    setVariants((p) =>
      p.map((v) => {
        const { [name]: _drop, ...rest } = v.options;
        return { ...v, options: rest };
      })
    );
  };

  const addVariant = () =>
    setVariants((p) => [
      ...p,
      {
        id: `${form.id}-var-${Date.now()}-${p.length}`,
        label: "",
        sku: null,
        price: null,
        stock: 0,
        stock_reserved: 0,
        po_quota: null,
        po_filled: 0,
        po_reserved: 0,
        image: null,
        is_active: true,
        order_index: p.length,
        options: Object.fromEntries(attrNames.filter((n) => n.trim()).map((n) => [n, ""])),
      },
    ]);

  const updateVariant = <K extends keyof VariantRow>(
    id: string,
    key: K,
    value: VariantRow[K]
  ) =>
    setVariants((p) => p.map((v) => (v.id === id ? { ...v, [key]: value } : v)));

  const updateVariantOption = (id: string, attr: string, value: string) =>
    setVariants((p) =>
      p.map((v) => (v.id === id ? { ...v, options: { ...v.options, [attr]: value } } : v))
    );

  const removeVariant = (id: string) =>
    setVariants((p) => p.filter((v) => v.id !== id));

  // Keep every variant's options keyed to exactly the current attribute
  // list -- a renamed/removed axis must not leave a stale key lying around.
  const cleanLabel = (v: VariantRow) =>
    attrNames
      .filter((n) => n.trim())
      .map((n) => v.options[n])
      .filter(Boolean)
      .join(" / ") || v.label;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const legacyOptions = variantText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const cleanAttrs = attrNames.map((n) => n.trim()).filter(Boolean);
    const cleanVariants = usesAttrs
      ? variants
          .filter((v) => cleanAttrs.every((a) => v.options[a]?.trim()))
          .map((v) => ({ ...v, label: cleanLabel(v) }))
      : [];

    await onSave(
      {
        ...form,
        slug: form.slug || slugifyName(form.name),
        // Legacy single-axis variant text only applies when the new
        // multi-attribute builder below is empty -- a product uses one
        // system or the other, never both.
        variant_options:
          !usesAttrs && legacyOptions.length ? legacyOptions : null,
        variant_name:
          !usesAttrs && legacyOptions.length ? form.variant_name || "Ukuran" : null,
        po_quota: form.stock_type === "pre_order" ? form.po_quota : null,
        po_deadline: form.stock_type === "pre_order" ? form.po_deadline : null,
      },
      images,
      cleanAttrs.map((name) => ({ name })),
      cleanVariants
    );
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl my-8 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">
            {isNew ? "Produk Baru" : "Edit Produk"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Produk
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              className={field}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug (URL)
              </label>
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                placeholder={slugifyName(form.name) || "otomatis dari nama"}
                className={`${field} font-mono`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Harga Dasar (Rp)
              </label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value) || 0)}
                required
                className={field}
              />
              {usesAttrs && (
                <p className="text-xs text-gray-400 mt-1">
                  Dipakai jika varian tidak punya harga sendiri.
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={`${field} resize-none`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipe Penjualan
            </label>
            <select
              value={form.stock_type}
              onChange={(e) =>
                set("stock_type", e.target.value as ProductRow["stock_type"])
              }
              className={field}
            >
              <option value="ready_stock">Ready Stock</option>
              <option value="pre_order">Pre-Order</option>
            </select>
          </div>

          {form.stock_type === "pre_order" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tenggat PO
              </label>
              <input
                type="date"
                value={form.po_deadline ?? ""}
                onChange={(e) => set("po_deadline", e.target.value || null)}
                className={field}
              />
            </div>
          )}

          {!usesAttrs && (
            <>
              {form.stock_type === "ready_stock" ? (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Jumlah Stok
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.stock}
                      onChange={(e) => set("stock", Number(e.target.value) || 0)}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Ditahan pesanan
                    </label>
                    <input
                      value={form.stock_reserved}
                      disabled
                      className={`${field} bg-gray-50 text-gray-500`}
                    />
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Kuota PO
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.po_quota ?? 0}
                      onChange={(e) => set("po_quota", Number(e.target.value) || 0)}
                      className={field}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Terisi
                    </label>
                    <input
                      value={`${form.po_filled ?? 0} + ${form.po_reserved ?? 0} ditahan`}
                      disabled
                      className={`${field} bg-gray-50 text-gray-500`}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nama Varian Sederhana
                  </label>
                  <input
                    value={form.variant_name ?? ""}
                    onChange={(e) => set("variant_name", e.target.value || null)}
                    placeholder="Ukuran"
                    className={field}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Pilihan
                  </label>
                  <input
                    value={variantText}
                    onChange={(e) => setVariantText(e.target.value)}
                    placeholder="S, M, L, XL"
                    className={field}
                  />
                </div>
              </div>
              <p className="text-xs text-gray-400">
                Dipakai kalau produk hanya punya satu jenis pilihan (misalnya
                cuma ukuran). Untuk kombinasi (warna x ukuran), pakai
                &quot;Atribut &amp; Varian&quot; di bawah -- dan kosongkan ini.
              </p>
            </>
          )}

          <hr className="border-gray-100" />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Galeri Foto
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img, idx) => (
                <div key={img.id} className="relative group">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={img.url}
                    alt={img.alt_text}
                    className="aspect-square w-full rounded-lg object-cover border border-gray-200"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((p) => p.filter((_, i) => i !== idx))}
                    className="absolute top-1 right-1 rounded-full bg-black/60 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Utama
                    </span>
                  )}
                </div>
              ))}
              <div className="aspect-square">
                <MiniImageUpload
                  onUploaded={(url, dims) =>
                    setImages((p) => [
                      ...p,
                      {
                        id: `${form.id}-img-${Date.now()}-${p.length}`,
                        url,
                        alt_text: form.name,
                        width: dims?.width ?? null,
                        height: dims?.height ?? null,
                        order_index: p.length,
                      },
                    ])
                  }
                />
              </div>
            </div>
            <p className="text-xs text-gray-400 mt-1.5">
              Foto pertama jadi foto utama di etalase. Tambah lagi untuk galeri.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Atribut &amp; Varian
              </label>
              <button
                type="button"
                onClick={addAttribute}
                className="text-xs font-medium text-emerald-700 hover:underline"
              >
                + Tambah atribut
              </button>
            </div>

            {attrNames.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {attrNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-1">
                    <input
                      value={name}
                      onChange={(e) => renameAttribute(idx, e.target.value)}
                      placeholder="Warna, Ukuran, Lengan..."
                      className="w-32 rounded-lg border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => removeAttribute(idx)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {usesAttrs && (
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="w-6" />
                        {attrNames
                          .filter((n) => n.trim())
                          .map((n) => (
                            <th key={n} className="text-left px-2 py-2 font-medium text-gray-500">
                              {n}
                            </th>
                          ))}
                        <th className="text-left px-2 py-2 font-medium text-gray-500">SKU</th>
                        <th className="text-left px-2 py-2 font-medium text-gray-500">Harga</th>
                        <th className="text-left px-2 py-2 font-medium text-gray-500">
                          {form.stock_type === "ready_stock" ? "Stok" : "Kuota PO"}
                        </th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {variants.map((v) => (
                        <tr key={v.id}>
                          <td className="px-2 py-1.5 text-gray-300">
                            <GripVertical className="w-3.5 h-3.5" />
                          </td>
                          {attrNames
                            .filter((n) => n.trim())
                            .map((n) => (
                              <td key={n} className="px-2 py-1.5">
                                <input
                                  value={v.options[n] ?? ""}
                                  onChange={(e) => updateVariantOption(v.id, n, e.target.value)}
                                  placeholder={n}
                                  className="w-20 rounded border border-gray-200 px-1.5 py-1 outline-none focus:border-emerald-500"
                                />
                              </td>
                            ))}
                          <td className="px-2 py-1.5">
                            <input
                              value={v.sku ?? ""}
                              onChange={(e) => updateVariant(v.id, "sku", e.target.value || null)}
                              className="w-20 rounded border border-gray-200 px-1.5 py-1 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={v.price ?? ""}
                              placeholder={String(form.price)}
                              onChange={(e) =>
                                updateVariant(
                                  v.id,
                                  "price",
                                  e.target.value ? Number(e.target.value) : null
                                )
                              }
                              className="w-20 rounded border border-gray-200 px-1.5 py-1 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <input
                              type="number"
                              min={0}
                              value={form.stock_type === "ready_stock" ? v.stock : v.po_quota ?? 0}
                              onChange={(e) =>
                                updateVariant(
                                  v.id,
                                  form.stock_type === "ready_stock" ? "stock" : "po_quota",
                                  Number(e.target.value) || 0
                                )
                              }
                              className="w-16 rounded border border-gray-200 px-1.5 py-1 outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <button
                              type="button"
                              onClick={() => removeVariant(v.id)}
                              className="p-1 text-gray-400 hover:text-red-600"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <button
                  type="button"
                  onClick={addVariant}
                  className="w-full border-t border-gray-200 py-2 text-xs font-medium text-emerald-700 hover:bg-emerald-50"
                >
                  + Tambah kombinasi
                </button>
              </div>
            )}
            <p className="text-xs text-gray-400 mt-1.5">
              Tiap kombinasi (misalnya Hitam + L) punya stok sendiri. Harga
              boleh dikosongkan untuk ikut harga dasar di atas.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => set("is_active", e.target.checked)}
              className="rounded border-gray-300"
            />
            Tampilkan di etalase
          </label>

          {!isNew && (
            <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                Mengubah harga tidak memengaruhi pesanan lama -- harga sudah
                disalin ke pesanan saat dibuat.
              </span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan"}
          </button>
        </div>
      </form>
    </div>
  );
}

/** Compact "add a gallery photo" tile -- reuses the same upload/convert
 *  pipeline as ImageUpload but without its label/preview-replace chrome,
 *  since the gallery grid above already shows every uploaded photo. */
function MiniImageUpload({
  onUploaded,
}: {
  onUploaded: (url: string, size?: { width: number; height: number }) => void;
}) {
  return (
    <ImageUpload
      label=""
      value=""
      aspect="square"
      onChange={(url, size) => {
        if (url) onUploaded(url, size);
      }}
    />
  );
}
