"use client";

import { useState } from "react";
import { Search, Globe, Share2, CheckCircle, AlertCircle } from "lucide-react";

interface PageSeo {
  path: string;
  label: string;
  title: string;
  description: string;
  ogImage: string;
}

const initialPages: PageSeo[] = [
  {
    path: "/",
    label: "Beranda",
    title: "HIMA Teknik Lingkungan UNTAN",
    description: "Website resmi Himpunan Mahasiswa Teknik Lingkungan, Universitas Tanjungpura, Pontianak.",
    ogImage: "",
  },
  {
    path: "/tentang",
    label: "Tentang",
    title: "Tentang — HIMA Teknik Lingkungan UNTAN",
    description: "Profil dan sejarah Himpunan Mahasiswa Teknik Lingkungan Universitas Tanjungpura.",
    ogImage: "",
  },
  {
    path: "/departemen",
    label: "Departemen",
    title: "Departemen — HIMA Teknik Lingkungan UNTAN",
    description: "Struktur organisasi dan departemen HIMA Teknik Lingkungan UNTAN.",
    ogImage: "",
  },
  {
    path: "/merchandise",
    label: "Merchandise",
    title: "Merchandise — HIMA Teknik Lingkungan UNTAN",
    description: "Etalase merchandise resmi HIMA TL UNTAN — kaos, jaket, hoodie, dan lainnya.",
    ogImage: "",
  },
  {
    path: "/berita",
    label: "Berita",
    title: "Berita — HIMA Teknik Lingkungan UNTAN",
    description: "Berita dan kabar terbaru dari HIMA Teknik Lingkungan Universitas Tanjungpura.",
    ogImage: "",
  },
  {
    path: "/kontak",
    label: "Kontak",
    title: "Kontak — HIMA Teknik Lingkungan UNTAN",
    description: "Hubungi HIMA Teknik Lingkungan UNTAN via WhatsApp atau Instagram.",
    ogImage: "",
  },
];

function seoScore(p: PageSeo): { score: number; issues: string[] } {
  const issues: string[] = [];
  if (!p.title) issues.push("Title kosong");
  else if (p.title.length > 60) issues.push(`Title terlalu panjang (${p.title.length}/60)`);
  else if (p.title.length < 20) issues.push("Title terlalu pendek");
  if (!p.description) issues.push("Description kosong");
  else if (p.description.length > 160) issues.push(`Description terlalu panjang (${p.description.length}/160)`);
  else if (p.description.length < 50) issues.push("Description terlalu pendek");
  if (!p.ogImage) issues.push("OG Image belum diset");
  const max = 3;
  return { score: Math.round(((max - issues.length) / max) * 100), issues };
}

export default function AdminSeoPage() {
  const [pages, setPages] = useState<PageSeo[]>(initialPages);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [globalKeywords, setGlobalKeywords] = useState(
    "himatl untan, teknik lingkungan untan, hima teknik lingkungan pontianak"
  );
  const [sitemapGen, setSitemapGen] = useState(false);

  const updatePage = (idx: number, field: keyof PageSeo, val: string) => {
    setPages((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p))
    );
  };

  const avgScore = Math.round(
    pages.reduce((s, p) => s + seoScore(p).score, 0) / pages.length
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Meta tags, Open Graph, dan sitemap
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-medium ${
              avgScore >= 80
                ? "bg-green-100 text-green-700"
                : avgScore >= 50
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-red-100 text-red-700"
            }`}
          >
            Skor rata-rata: {avgScore}%
          </div>
        </div>
      </div>

      {/* Global */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900 text-sm">Pengaturan Global</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Keywords Global
            </label>
            <input
              value={globalKeywords}
              onChange={(e) => setGlobalKeywords(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">
              Pisahkan dengan koma
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Sitemap
            </label>
            <button
              onClick={() => setSitemapGen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              <Search className="w-4 h-4" />
              {sitemapGen ? "Sitemap di-generate" : "Generate sitemap.xml"}
            </button>
            {sitemapGen && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                sitemap.xml berhasil di-generate (demo)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Per-page SEO */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900 text-sm">
            Meta per Halaman
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {pages.map((page, idx) => {
            const { score, issues } = seoScore(page);
            return (
              <div key={page.path} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded">
                      {page.path}
                    </span>
                    <span className="font-medium text-gray-900 text-sm">
                      {page.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded ${
                        score >= 80
                          ? "bg-green-100 text-green-700"
                          : score >= 50
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                      }`}
                    >
                      {score}%
                    </span>
                    <button
                      onClick={() =>
                        setEditIdx(editIdx === idx ? null : idx)
                      }
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      {editIdx === idx ? "Tutup" : "Edit"}
                    </button>
                  </div>
                </div>

                {issues.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {issues.map((issue) => (
                      <span
                        key={issue}
                        className="inline-flex items-center gap-1 text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded"
                      >
                        <AlertCircle className="w-3 h-3" />
                        {issue}
                      </span>
                    ))}
                  </div>
                )}

                {/* Google Preview */}
                <div className="bg-gray-50 rounded-lg p-3 mt-2">
                  <div className="text-xs text-green-700 font-mono truncate">
                    hima.tekniklingkungan.com{page.path}
                  </div>
                  <div className="text-sm text-blue-700 font-medium truncate mt-0.5">
                    {page.title || "Belum diset"}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {page.description || "Deskripsi belum diset."}
                  </div>
                </div>

                {/* Edit panel */}
                {editIdx === idx && (
                  <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Meta Title{" "}
                        <span className="text-gray-400">
                          ({page.title.length}/60)
                        </span>
                      </label>
                      <input
                        value={page.title}
                        onChange={(e) =>
                          updatePage(idx, "title", e.target.value)
                        }
                        maxLength={70}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Meta Description{" "}
                        <span className="text-gray-400">
                          ({page.description.length}/160)
                        </span>
                      </label>
                      <textarea
                        value={page.description}
                        onChange={(e) =>
                          updatePage(idx, "description", e.target.value)
                        }
                        maxLength={200}
                        rows={2}
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm resize-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        OG Image URL (Google Drive)
                      </label>
                      <input
                        value={page.ogImage}
                        onChange={(e) =>
                          updatePage(idx, "ogImage", e.target.value)
                        }
                        placeholder="https://drive.google.com/file/d/FILE_ID/view"
                        className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Demo — perubahan hanya berlaku di sesi ini. Pada produksi, meta tags
        disimpan di Supabase dan di-render server-side.
      </p>
    </div>
  );
}
