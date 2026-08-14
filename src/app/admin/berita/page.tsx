import { articles } from "@/data/news";
import { Plus, Pencil, Eye, Trash2 } from "lucide-react";
import Link from "next/link";

export default function AdminBeritaPage() {
  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Berita</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola artikel dan berita kegiatan</p>
        </div>
        <button className="inline-flex items-center gap-2 bg-emerald-600 text-white font-medium px-4 py-2.5 rounded-lg hover:bg-emerald-700 transition-colors text-sm">
          <Plus className="w-4 h-4" />
          Tulis Artikel
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-5 py-3 font-medium text-gray-500">Judul</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Kategori</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Penulis</th>
                <th className="text-left px-5 py-3 font-medium text-gray-500">Tanggal</th>
                <th className="text-right px-5 py-3 font-medium text-gray-500">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {articles.map((article) => (
                <tr key={article.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-900 max-w-md truncate">{article.title}</div>
                    <div className="text-xs text-gray-400 mt-0.5">/{article.slug}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded">
                      {article.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{article.author}</td>
                  <td className="px-5 py-3 text-gray-500">
                    {new Date(article.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`/berita/${article.slug}`}
                        className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </Link>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-red-600 transition-colors">
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
    </div>
  );
}
