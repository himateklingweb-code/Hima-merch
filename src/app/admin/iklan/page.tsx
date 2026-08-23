"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { ads as seedAds, Ad } from "@/data/ads";
import { useCollection } from "@/lib/use-collection";
import DbStatus from "@/components/admin/DbStatus";
import { gdriveThumbnail } from "@/data/news";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Image as ImageIcon,
  ExternalLink,
} from "lucide-react";

/** Database shape. The column is `order_index`; the app type calls it `order`. */
interface AdRow {
  id: string;
  name: string;
  blurb: string;
  logo: string | null;
  website: string;
  active: boolean;
  order_index: number;
}

const toRow = (a: Ad): AdRow => ({
  id: a.id,
  name: a.name,
  blurb: a.blurb,
  logo: a.logo || null,
  website: a.website,
  active: a.active,
  order_index: a.order,
});

const fromRow = (r: AdRow): Ad => ({
  id: r.id,
  name: r.name,
  blurb: r.blurb ?? "",
  logo: r.logo ?? "",
  website: r.website,
  active: r.active,
  order: r.order_index,
});

export default function AdminIklanPage() {
  const {
    items: rows,
    loading,
    live,
    error,
    saving,
    save,
    remove,
  } = useCollection<AdRow>("ads", seedAds.map(toRow), {
    orderBy: "order_index",
    ascending: true,
    revalidate: () => ["/"],
  });
  const items: Ad[] = rows.map(fromRow);
  const [editing, setEditing] = useState<Ad | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (ad: Ad) => {
    const ok = await save(toRow(ad));
    if (!ok) return;
    setEditing(null);
    setIsNew(false);
  };

  const handleDelete = async (id: string) => {
    if (await remove(id)) setDeleteId(null);
  };

  const toggleActive = async (id: string) => {
    const ad = items.find((a) => a.id === id);
    if (ad) await save(toRow({ ...ad, active: !ad.active }));
  };

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: `ad-${Date.now()}`,
      name: "",
      blurb: "",
      logo: "",
      website: "",
      active: true,
      order: items.length + 1,
    });
  };

  const sorted = [...items].sort((a, b) => a.order - b.order);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Iklan Mitra</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kartu iklan yang tampil di carousel beranda
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DbStatus live={live} loading={loading} error={error} saving={saving} />
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Iklan
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Logo
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Mitra
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Website Tujuan
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Urutan
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Status
                </th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {sorted.map((ad) => (
                <tr key={ad.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    {ad.logo ? (
                      <img
                        src={gdriveThumbnail(ad.logo, 120)}
                        alt=""
                        className="w-14 h-10 rounded object-contain bg-gray-50 border border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate">
                      {ad.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">
                      {ad.blurb}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {ad.website ? (
                      <a
                        href={ad.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline max-w-[220px] truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{ad.website}</span>
                      </a>
                    ) : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{ad.order}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(ad.id)}
                      className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                        ad.active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {ad.active ? "Tayang" : "Draft"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => {
                          setIsNew(false);
                          setEditing(ad);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(ad.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Belum ada iklan mitra.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <AdModal
          ad={editing}
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
            <h3 className="font-bold text-gray-900 mb-1">Hapus Iklan?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Kartu akan hilang dari carousel beranda secara permanen.
            </p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Batal
              </button>
              <button
                onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
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

function AdModal({
  ad,
  isNew,
  onSave,
  onClose,
}: {
  ad: Ad;
  isNew: boolean;
  onSave: (a: Ad) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...ad });

  const set = <K extends keyof Ad>(key: K, val: Ad[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSave(form);
        }}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl my-8 p-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 text-lg">
            {isNew ? "Iklan Baru" : "Edit Iklan"}
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
              Nama Mitra / Sponsor
            </label>
            <input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
              placeholder="Contoh: Bank Sampah Kalbar Bersih"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
          </div>

          {/* Destination website — the whole card links here */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Website Tujuan
            </label>
            <input
              type="url"
              value={form.website}
              onChange={(e) => set("website", e.target.value)}
              required
              placeholder="https://situs-mitra.com"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm font-mono"
            />
            <p className="text-xs text-gray-400 mt-1">
              Pengunjung diarahkan ke alamat ini saat kartu diklik. Wajib
              diawali https://
            </p>
          </div>

          {/* Sponsor logo */}
          <ImageUpload
            label="Logo Sponsor"
            value={form.logo}
            onChange={(url) => set("logo", url)}
            hint="Kosongkan untuk memakai nama mitra sebagai teks."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              value={form.blurb}
              onChange={(e) => set("blurb", e.target.value)}
              rows={2}
              placeholder="Satu kalimat penawaran atau perkenalan mitra."
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Urutan Tampil
              </label>
              <input
                type="number"
                min={1}
                value={form.order}
                onChange={(e) => set("order", Number(e.target.value) || 1)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={form.active ? "1" : "0"}
                onChange={(e) => set("active", e.target.value === "1")}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              >
                <option value="1">Tayang</option>
                <option value="0">Draft</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Simpan
          </button>
        </div>
      </form>
    </div>
  );
}
