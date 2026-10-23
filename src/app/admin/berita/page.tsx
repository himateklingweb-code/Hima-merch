"use client";

/* eslint-disable @next/next/no-img-element */
import { useMemo, useState } from "react";
import { articles as seedArticles, Article, slugify } from "@/data/news";
import ImageUpload from "@/components/admin/ImageUpload";
import { useCollection } from "@/lib/use-collection";
import DbStatus from "@/components/admin/DbStatus";
import AdminSearch from "@/components/admin/AdminSearch";
import { matchesQuery } from "@/lib/search";
import {
  Plus,
  Pencil,
  Eye,
  Trash2,
  X,
  Image as ImageIcon,
  Pin,
  Tag,
} from "lucide-react";
import Link from "next/link";

interface Category {
  id: string;
  name: string;
  order_index: number;
}

const SEED_CATEGORIES: Category[] = [
  { id: "cat-kegiatan", name: "Kegiatan", order_index: 0 },
  { id: "cat-seminar", name: "Seminar", order_index: 1 },
  { id: "cat-merchandise", name: "Merchandise", order_index: 2 },
  { id: "cat-prestasi", name: "Prestasi", order_index: 3 },
  { id: "cat-pengumuman", name: "Pengumuman", order_index: 4 },
];

export default function AdminBeritaPage() {
  const {
    items,
    loading,
    live,
    error,
    saving,
    save,
    remove,
  } = useCollection<Article>("articles", seedArticles, {
    orderBy: "published_at",
    ascending: false,
    revalidate: (row) => [
      "/",
      "/berita",
      ...(row?.slug ? [`/berita/${row.slug}`] : []),
    ],
  });

  // Kategori sekarang tabel sendiri (content_categories) yang bisa ditambah
  // pengurus dari sini, bukan daftar tetap di kode. Nama kategori tetap
  // disimpan sebagai teks di articles.category — tabel ini hanya menjadi
  // sumber pilihan di dropdown, jadi artikel lama tidak perlu dimigrasikan.
  const { items: categories, save: saveCategory } = useCollection<Category>(
    "content_categories",
    SEED_CATEGORIES,
    { orderBy: "order_index", ascending: true }
  );

  const [editing, setEditing] = useState<Article | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [pinnedFilter, setPinnedFilter] = useState(false);

  const filterOptions = useMemo(
    () => [...new Set([...categories.map((c) => c.name), ...items.map((a) => a.category)])]
      .filter(Boolean)
      .sort(),
    [categories, items]
  );
  const shown = useMemo(
    () =>
      items.filter(
        (a) =>
          (!categoryFilter || a.category === categoryFilter) &&
          (!pinnedFilter || a.is_pinned) &&
          matchesQuery(
            q,
            a.title,
            a.slug,
            a.author,
            a.excerpt,
            a.published_at,
            ...(a.tags ?? [])
          )
      ),
    [items, q, categoryFilter, pinnedFilter]
  );

  const handleSave = async (article: Article) => {
    if (!(await save(article))) return;
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    if (await remove(id)) setDeleteId(null);
  };

  const openNew = () => {
    setEditing({
      id: `news-${Date.now()}`,
      title: "",
      slug: "",
      excerpt: "",
      content: "",
      category: categories[0]?.name ?? "Kegiatan",
      author: "Tim Kominfo",
      image: "",
      image_alt: "",
      image_width: null,
      image_height: null,
      tags: [],
      is_pinned: false,
      published_at: new Date().toISOString().slice(0, 10),
    });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Berita</h1>
          <p className="text-sm text-gray-500 mt-1">
            Kelola artikel &amp; foto kegiatan
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DbStatus live={live} loading={loading} error={error} saving={saving} />
          <button
            onClick={openNew}
            className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Tulis Artikel
          </button>
        </div>
      </div>

      <AdminSearch
        value={q}
        onChange={setQ}
        placeholder="Cari judul, penulis, tag, tanggal…"
        total={items.length}
        shown={shown.length}
      >
        {filterOptions.length > 1 && (
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter kategori"
            className="h-10 rounded-lg border border-gray-200 bg-white px-3 text-sm text-gray-700 outline-none focus:border-emerald-500"
          >
            <option value="">Semua kategori</option>
            {filterOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        )}
        <button
          type="button"
          onClick={() => setPinnedFilter((v) => !v)}
          aria-pressed={pinnedFilter}
          className={`inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors ${
            pinnedFilter
              ? "border-emerald-600 bg-emerald-50 text-emerald-700"
              : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          <Pin className="h-3.5 w-3.5" />
          Disorot
        </button>
      </AdminSearch>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Foto
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Judul
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Kategori
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Penulis
                </th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">
                  Tanggal
                </th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {!loading && shown.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-gray-400">
                    {items.length === 0 ? "Belum ada artikel." : "Tidak ada artikel yang cocok."}
                  </td>
                </tr>
              )}
              {shown.map((article) => (
                <tr
                  key={article.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    {article.image ? (
                      <img
                        src={article.image}
                        alt=""
                        className="w-14 h-10 rounded object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-10 rounded bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-300">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      {article.is_pinned && (
                        <Pin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                      )}
                      <div className="font-medium text-gray-900 max-w-md truncate">
                        {article.title}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      /{article.slug}
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {article.author}
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(article.published_at).toLocaleDateString(
                      "id-ID",
                      { day: "numeric", month: "short", year: "numeric" }
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/berita/${article.slug}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button
                        onClick={() => {
                          setEditing(article);
                        }}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteId(article.id)}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/New Modal */}
      {editing && (
        <ArticleModal
          article={editing}
          categories={categories}
          onAddCategory={async (name) => {
            const id = `cat-${Date.now()}`;
            await saveCategory({ id, name, order_index: categories.length });
            return name;
          }}
          onSave={handleSave}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}

      {/* Delete Confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6 text-center">
            <Trash2 className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-bold text-gray-900 mb-1">Hapus Artikel?</h3>
            <p className="text-sm text-gray-500 mb-5">
              Artikel akan dihapus dari daftar secara permanen.
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

function ArticleModal({
  article,
  categories,
  onAddCategory,
  onSave,
  onClose,
}: {
  article: Article;
  categories: Category[];
  onAddCategory: (name: string) => Promise<string>;
  onSave: (a: Article) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...article });
  const [tagInput, setTagInput] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const set = <K extends keyof Article>(key: K, val: Article[K]) =>
    setForm((prev) => ({
      ...prev,
      [key]: val,
      ...(key === "title" && !article.title
        ? { slug: slugify(val as string) }
        : {}),
    }));

  const addTag = () => {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) {
      setTagInput("");
      return;
    }
    set("tags", [...form.tags, t]);
    setTagInput("");
  };

  const removeTag = (t: string) => set("tags", form.tags.filter((x) => x !== t));

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setAddingCategory(true);
    await onAddCategory(name);
    setAddingCategory(false);
    set("category", name);
    setNewCategory("");
  };

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
            {article.title ? "Edit Artikel" : "Artikel Baru"}
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
              Judul
            </label>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Slug
              </label>
              <input
                value={form.slug}
                onChange={(e) => set("slug", e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Kategori
              </label>
              <select
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              >
                {!categories.some((c) => c.name === form.category) && form.category && (
                  <option value={form.category}>{form.category}</option>
                )}
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="mt-1.5 flex gap-1.5">
                <input
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void addCategory();
                    }
                  }}
                  placeholder="Tambah kategori baru…"
                  className="flex-1 px-2.5 py-1.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-xs"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  disabled={!newCategory.trim() || addingCategory}
                  className="shrink-0 rounded-lg border border-emerald-600 px-2.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                >
                  Tambah
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Penulis
              </label>
              <input
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tanggal Publish
              </label>
              <input
                type="date"
                value={form.published_at}
                onChange={(e) => set("published_at", e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={form.is_pinned}
              onChange={(e) => set("is_pinned", e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
            />
            <Pin className="h-4 w-4 text-gray-400" />
            Sorot di halaman utama &amp; urutkan paling atas di Berita
          </label>

          {/* Cover photo — rasio asli file yang diunggah ikut disimpan, jadi
              tampilan tidak memaksa gambar ke kotak tetap. */}
          <ImageUpload
            label="Foto Sampul"
            value={form.image}
            onChange={(url, size) =>
              setForm((prev) => ({
                ...prev,
                image: url,
                image_width: size?.width ?? null,
                image_height: size?.height ?? null,
              }))
            }
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alt Text Foto
            </label>
            <input
              value={form.image_alt}
              onChange={(e) => set("image_alt", e.target.value)}
              placeholder="Deskripsi singkat foto"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tag
            </label>
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-2 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
                >
                  <Tag className="h-3 w-3" />
                  {t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    aria-label={`Hapus tag ${t}`}
                    className="text-emerald-500 hover:text-emerald-800"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                onBlur={addTag}
                placeholder={form.tags.length ? "" : "Ketik lalu Enter…"}
                className="min-w-[8ch] flex-1 border-none p-1 text-sm outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Ringkasan
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Konten (HTML)
            </label>
            <textarea
              value={form.content}
              onChange={(e) => set("content", e.target.value)}
              rows={8}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm font-mono resize-y"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="col-span-2 -mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Tombol di Akhir Artikel (opsional)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                Kosongkan keduanya kalau tidak perlu tombol — tidak akan
                muncul di halaman berita.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nama Tombol
              </label>
              <input
                value={form.cta_label ?? ""}
                onChange={(e) => set("cta_label", e.target.value)}
                placeholder="Contoh: Daftar Sekarang"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Link Tujuan
              </label>
              <input
                value={form.cta_url ?? ""}
                onChange={(e) => set("cta_url", e.target.value)}
                placeholder="https://... atau /merchandise"
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm font-mono"
              />
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
