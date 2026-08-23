"use client";

import { useState } from "react";
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
} from "lucide-react";
import { formatPrice, slugifyName } from "@/data/products";
import { useCollection } from "@/lib/use-collection";
import DbStatus from "@/components/admin/DbStatus";
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
 * Recap of everyone who ordered one specific product — one row per
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

/** The products table as stored, which is what the form edits. */
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
  };
}

export default function AdminProdukPage() {
  const { items, loading, live, error, saving, save, remove } =
    useCollection<ProductRow>("products", [], {
      orderBy: "created_at",
      ascending: true,
    });

  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);

  const handleSave = async (row: ProductRow) => {
    if (!(await save(row))) return;
    setEditing(null);
    setIsNew(false);
  };

  const handleExportBuyers = async (p: ProductRow) => {
    setExportingId(p.id);
    await exportProductBuyers(p);
    setExportingId(null);
  };

  const toggleActive = async (p: ProductRow) =>
    save({ ...p, is_active: !p.is_active });

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
              {!loading && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    Belum ada produk.
                  </td>
                </tr>
              )}

              {items.map((p) => {
                const available =
                  p.stock_type === "ready_stock"
                    ? p.stock - p.stock_reserved
                    : (p.po_quota ?? 0) -
                      (p.po_filled ?? 0) -
                      (p.po_reserved ?? 0);

                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="font-medium text-gray-900">{p.name}</div>
                      <div className="text-xs text-gray-400">/{p.slug}</div>
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
                      {(p.stock_reserved > 0 || (p.po_reserved ?? 0) > 0) && (
                        <div className="text-[11px] text-amber-600">
                          {p.stock_type === "ready_stock"
                            ? p.stock_reserved
                            : p.po_reserved}{" "}
                          ditahan pesanan
                        </div>
                      )}
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
  onSave: (p: ProductRow) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ProductRow>({ ...product });
  const [variantText, setVariantText] = useState(
    (product.variant_options ?? []).join(", ")
  );

  const set = <K extends keyof ProductRow>(k: K, v: ProductRow[K]) =>
    setForm((p) => ({ ...p, [k]: v }));

  const field =
    "w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const options = variantText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    onSave({
      ...form,
      slug: form.slug || slugifyName(form.name),
      variant_options: options.length ? options : null,
      variant_name: options.length ? form.variant_name || "Ukuran" : null,
      // Pre-order fields only mean something for pre-order products.
      po_quota: form.stock_type === "pre_order" ? form.po_quota : null,
      po_deadline: form.stock_type === "pre_order" ? form.po_deadline : null,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <form
        onSubmit={submit}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 p-6"
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
                Harga (Rp)
              </label>
              <input
                type="number"
                min={0}
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value) || 0)}
                required
                className={field}
              />
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
                <p className="text-xs text-gray-400 mt-1">
                  Diatur otomatis oleh pesanan — jangan diubah manual.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
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
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Varian
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
                Pilihan Varian
              </label>
              <input
                value={variantText}
                onChange={(e) => setVariantText(e.target.value)}
                placeholder="S, M, L, XL"
                className={field}
              />
              <p className="text-xs text-gray-400 mt-1">
                Pisahkan dengan koma. Kosongkan kalau tanpa varian.
              </p>
            </div>
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
                Mengubah harga tidak memengaruhi pesanan lama — harga sudah
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
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
