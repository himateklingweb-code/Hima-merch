"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { articles as seedArticles, Article, gdriveThumbnail, slugify } from "@/data/news";
import ImageUpload from "@/components/admin/ImageUpload";
import { useCollection } from "@/lib/use-collection";
import DbStatus from "@/components/admin/DbStatus";
import { Plus, Pencil, Eye, Trash2, X, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

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
  });
  const [editing, setEditing] = useState<Article | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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
      category: "Kegiatan",
      author: "Tim Kominfo",
      image: "",
      image_alt: "",
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
              {items.map((article) => (
                <tr
                  key={article.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-5 py-3">
                    {article.image &&
                    article.image !== "/placeholder-news.png" ? (
                      <img
                        src={gdriveThumbnail(article.image, 120)}
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
                    <div className="font-medium text-gray-900 max-w-md truncate">
                      {article.title}
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
              Artikel akan dihapus dari daftar. (Demo — tidak permanen)
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
  onSave,
  onClose,
}: {
  article: Article;
  onSave: (a: Article) => void | Promise<void>;
  onClose: () => void;
}) {
  const [form, setForm] = useState({ ...article });

  const set = (key: keyof Article, val: string) =>
    setForm((prev) => ({
      ...prev,
      [key]: val,
      ...(key === "title" && !article.title ? { slug: slugify(val) } : {}),
    }));

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
                {["Kegiatan", "Seminar", "Merchandise", "Prestasi", "Pengumuman"].map(
                  (c) => (
                    <option key={c}>{c}</option>
                  )
                )}
              </select>
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

          {/* Cover photo */}
          <ImageUpload
            label="Foto Sampul"
            value={form.image === "/placeholder-news.png" ? "" : form.image}
            onChange={(url) => setForm((prev) => ({ ...prev, image: url }))}
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
        <p className="text-xs text-gray-400 mt-3">
          Demo — perubahan hanya berlaku di sesi ini.
        </p>
      </form>
    </div>
  );
}
