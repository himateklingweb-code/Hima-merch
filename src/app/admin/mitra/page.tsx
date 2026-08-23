"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { partners as seedPartners, Partner } from "@/data/partners";
import { useCollection } from "@/lib/use-collection";
import DbStatus from "@/components/admin/DbStatus";
import ImageUpload from "@/components/admin/ImageUpload";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Building2,
  ExternalLink,
} from "lucide-react";

/** Database shape — adds the ordering/visibility columns the public Partner type doesn't need. */
interface PartnerRow {
  id: string;
  name: string;
  logo: string | null;
  description: string;
  website: string | null;
  type: "sponsor" | "mitra";
  order_index: number;
  is_active: boolean;
}

type EditablePartner = Partner & { order_index: number; is_active: boolean };

const toRow = (p: EditablePartner): PartnerRow => ({
  id: p.id,
  name: p.name,
  logo: p.logo || null,
  description: p.description,
  website: p.website || null,
  type: p.type,
  order_index: p.order_index,
  is_active: p.is_active,
});

const fromRow = (r: PartnerRow): EditablePartner => ({
  id: r.id,
  name: r.name,
  logo: r.logo ?? "",
  description: r.description ?? "",
  website: r.website,
  type: r.type,
  order_index: r.order_index,
  is_active: r.is_active,
});

const seedRows: PartnerRow[] = seedPartners.map((p, i) =>
  toRow({ ...p, order_index: i + 1, is_active: true })
);

export default function AdminMitraPage() {
  const {
    items: rows,
    loading,
    live,
    error,
    saving,
    save,
    remove,
  } = useCollection<PartnerRow>("partners", seedRows, {
    orderBy: "order_index",
    ascending: true,
  });
  const items = rows.map(fromRow);
  const [editing, setEditing] = useState<EditablePartner | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleSave = async (p: EditablePartner) => {
    const ok = await save(toRow(p));
    if (!ok) return;
    setEditing(null);
    setIsNew(false);
  };

  const handleDelete = async (id: string) => {
    if (await remove(id)) setDeleteId(null);
  };

  const toggleActive = async (id: string) => {
    const p = items.find((x) => x.id === id);
    if (p) await save(toRow({ ...p, is_active: !p.is_active }));
  };

  const openNew = () => {
    setIsNew(true);
    setEditing({
      id: `partner-${Date.now()}`,
      name: "",
      logo: "",
      description: "",
      website: null,
      type: "mitra",
      order_index: items.length + 1,
      is_active: true,
    });
  };

  const sorted = [...items].sort((a, b) => a.order_index - b.order_index);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mitra &amp; Sponsor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kartu kemitraan yang tampil di halaman /kemitraan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DbStatus live={live} loading={loading} error={error} saving={saving} />
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Tambah Mitra
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
                  Nama
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Label
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Website
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
              {sorted.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    {p.logo ? (
                      <img
                        src={p.logo}
                        alt=""
                        className="w-14 h-10 rounded object-contain bg-gray-50 border border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                        <Building2 className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 max-w-xs truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5 max-w-xs truncate">
                      {p.description}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        p.type === "sponsor"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {p.type === "sponsor" ? "Sponsor" : "Mitra"}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {p.website ? (
                      <a
                        href={p.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-700 hover:underline max-w-[200px] truncate"
                      >
                        <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{p.website}</span>
                      </a>
                    ) : (
                      <span className="text-gray-300">&mdash;</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{p.order_index}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleActive(p.id)}
                      className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                        p.is_active
                          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {p.is_active ? "Tayang" : "Draft"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
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
              ))}
              {sorted.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-10 text-center text-gray-400"
                  >
                    Belum ada mitra atau sponsor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <PartnerModal
          partner={editing}
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
            <h3 className="font-bold text-gray-900 mb-1">Hapus Mitra?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Kartu akan hilang dari halaman Kemitraan secara permanen.
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

function PartnerModal({
  partner,
  isNew,
  onSave,
  onClose,
}: {
  partner: EditablePartner;
  isNew: boolean;
  onSave: (p: EditablePartner) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...partner });

  const set = <K extends keyof EditablePartner>(
    key: K,
    val: EditablePartner[K]
  ) => setForm((prev) => ({ ...prev, [key]: val }));

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
            {isNew ? "Mitra Baru" : "Edit Mitra"}
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
              placeholder="Contoh: Dinas Lingkungan Hidup Kota Pontianak"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Label
            </label>
            <div className="flex gap-2">
              {(["mitra", "sponsor"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => set("type", t)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    form.type === t
                      ? t === "sponsor"
                        ? "border-amber-300 bg-amber-50 text-amber-800"
                        : "border-blue-300 bg-blue-50 text-blue-800"
                      : "border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {t === "sponsor" ? "Sponsor" : "Mitra"}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Menentukan badge yang tampil di kartu pada halaman Kemitraan.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Link Website (opsional)
            </label>
            <input
              type="url"
              value={form.website ?? ""}
              onChange={(e) => set("website", e.target.value || null)}
              placeholder="https://situs-mitra.com"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm font-mono"
            />
          </div>

          <ImageUpload
            label="Logo"
            value={form.logo}
            onChange={(url) => set("logo", url)}
            hint="Kosongkan untuk memakai nama mitra sebagai teks."
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Deskripsi Singkat
            </label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Satu-dua kalimat tentang bentuk kerja samanya."
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
                value={form.order_index}
                onChange={(e) =>
                  set("order_index", Number(e.target.value) || 1)
                }
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={form.is_active ? "1" : "0"}
                onChange={(e) => set("is_active", e.target.value === "1")}
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
