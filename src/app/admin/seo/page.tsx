"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Globe,
  Share2,
  CheckCircle,
  AlertCircle,
  FileText,
  Package,
} from "lucide-react";
import { productSeo } from "@/data/products";
import { articleSeo } from "@/data/news";
import { getSupabase } from "@/lib/supabase";
import ImageUpload from "@/components/admin/ImageUpload";
import { products as seedProducts } from "@/data/products";
import { articles as seedArticles } from "@/data/news";
import { seoIssues, seoScore, TITLE_MAX, DESC_MAX } from "@/data/seo";

interface PageSeo {
  /** Row id + table, present only for rows backed by a database table. */
  id?: string;
  table?: "products" | "articles" | "site_meta";
  path: string;
  label: string;
  title: string;
  description: string;
  ogImage: string;
}

// Loaded from the site_meta table at mount; the array below is only the
// shape, not the source of truth.
const staticPages: PageSeo[] = [];

// Detail pages seed from their resolved meta — what is live right now,
// whether that came from an override or from the content itself.
const productPages: PageSeo[] = seedProducts.map((p) => ({
  id: p.id,
  table: "products" as const,
  path: `/merchandise/${p.slug}`,
  label: p.name,
  ...productSeo(p),
}));

const articlePages: PageSeo[] = seedArticles.map((a) => ({
  id: a.id,
  table: "articles" as const,
  path: `/berita/${a.slug}`,
  label: a.title,
  ...articleSeo(a),
}));

export default function AdminSeoPage() {
  const [pages, setPages] = useState<PageSeo[]>(staticPages);
  const [prodPages, setProdPages] = useState<PageSeo[]>(productPages);
  const [artPages, setArtPages] = useState<PageSeo[]>(articlePages);
  const [editKey, setEditKey] = useState<string | null>(null);
  const [globalKeywords, setGlobalKeywords] = useState(
    "himatl untan, teknik lingkungan untan, hima teknik lingkungan pontianak"
  );
  const [sitemapGen, setSitemapGen] = useState(false);

  // All three groups come from the database. Products and articles are
  // listed from their own tables rather than the bundled seed, so a product
  // added after launch still shows up here.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let cancelled = false;

    void (async () => {
      const [meta, prods, arts] = await Promise.all([
        supabase.from("site_meta").select("*").order("path"),
        supabase.from("products").select("id, name, slug, description, seo").order("id"),
        supabase.from("articles").select("id, title, slug, excerpt, image, seo").order("published_at", { ascending: false }),
      ]);
      if (cancelled) return;

      if (meta.data) {
        setPages(
          meta.data.map((r) => ({
            id: r.path as string,
            table: "site_meta" as const,
            path: r.path as string,
            label: r.label as string,
            title: (r.title as string) ?? "",
            description: (r.description as string) ?? "",
            ogImage: (r.og_image as string) ?? "",
          }))
        );
      }

      if (prods.data) {
        setProdPages(
          prods.data.map((p) => {
            const o = (p.seo ?? {}) as Record<string, string>;
            return {
              id: p.id as string,
              table: "products" as const,
              path: `/merchandise/${p.slug}`,
              label: p.name as string,
              title: o.title || `${p.name} — Merchandise HMTL UNTAN`,
              description: o.description || String(p.description ?? "").slice(0, 160),
              ogImage: o.ogImage ?? "",
            };
          })
        );
      }

      if (arts.data) {
        setArtPages(
          arts.data.map((a) => {
            const o = (a.seo ?? {}) as Record<string, string>;
            return {
              id: a.id as string,
              table: "articles" as const,
              path: `/berita/${a.slug}`,
              label: a.title as string,
              title: o.title || `${a.title} — Berita HMTL UNTAN`,
              description: o.description || String(a.excerpt ?? "").slice(0, 160),
              ogImage: o.ogImage ?? (a.image as string) ?? "",
            };
          })
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const all = [...pages, ...prodPages, ...artPages];
  // Guard the divide: the static list starts empty until the fetch lands.
  const avgScore = all.length
    ? Math.round(all.reduce((s, p) => s + seoScore(p), 0) / all.length)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SEO Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Meta tags, Open Graph, dan sitemap
          </p>
        </div>
        <div
          className={`px-3 py-1.5 rounded-full text-xs font-medium ${
            avgScore >= 80
              ? "bg-green-100 text-green-700"
              : avgScore >= 50
                ? "bg-yellow-100 text-yellow-700"
                : "bg-red-100 text-red-700"
          }`}
        >
          Skor rata-rata: {avgScore}% &middot; {all.length} halaman
        </div>
      </div>

      {/* Global */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-4 h-4 text-gray-500" />
          <h2 className="font-semibold text-gray-900 text-sm">
            Pengaturan Global
          </h2>
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
            <p className="text-xs text-gray-400 mt-1">Pisahkan dengan koma</p>
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

      <SeoSection
        icon={<Share2 className="w-4 h-4 text-gray-500" />}
        title="Meta per Halaman"
        note="Halaman statis utama."
        pages={pages}
        onChange={setPages}
        editKey={editKey}
        setEditKey={setEditKey}
      />

      <SeoSection
        icon={<Package className="w-4 h-4 text-gray-500" />}
        title="Halaman Produk (Merchandise)"
        note="Satu entri per produk. Kosongkan untuk memakai nama & deskripsi produk secara otomatis."
        pages={prodPages}
        onChange={setProdPages}
        editKey={editKey}
        setEditKey={setEditKey}
      />

      <SeoSection
        icon={<FileText className="w-4 h-4 text-gray-500" />}
        title="Halaman Berita (Artikel)"
        note="Satu entri per artikel. Kosongkan untuk memakai judul & ringkasan artikel secara otomatis."
        pages={artPages}
        onChange={setArtPages}
        editKey={editKey}
        setEditKey={setEditKey}
      />

      <p className="text-xs text-gray-400 mt-4">
        Semua perubahan di halaman ini tersimpan ke database dan langsung
        dipakai oleh{" "}
        <code className="font-mono">generateMetadata</code> — halaman statis di
        tabel <code className="font-mono">site_meta</code>, produk &amp; berita di
        kolom <code className="font-mono">seo</code> masing-masing.
      </p>
    </div>
  );
}

function SeoSection({
  icon,
  title,
  note,
  pages,
  onChange,
  editKey,
  setEditKey,
}: {
  icon: React.ReactNode;
  title: string;
  note: string;
  pages: PageSeo[];
  onChange: (next: PageSeo[]) => void;
  editKey: string | null;
  setEditKey: (k: string | null) => void;
}) {
  const [savingPath, setSavingPath] = useState<string | null>(null);
  const [savedPath, setSavedPath] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const update = (idx: number, field: keyof PageSeo, val: string) =>
    onChange(pages.map((p, i) => (i === idx ? { ...p, [field]: val } : p)));

  /**
   * Saves the override. Static pages write flat columns in site_meta;
   * products and articles write their own jsonb  column.
   */
  const persist = async (page: PageSeo) => {
    if (!page.id || !page.table) return;
    const supabase = getSupabase();
    if (!supabase) {
      setSaveError("Supabase belum dikonfigurasi.");
      return;
    }

    setSavingPath(page.path);
    setSaveError(null);
    const { error } =
      page.table === "site_meta"
        ? await supabase
            .from("site_meta")
            .update({
              title: page.title,
              description: page.description,
              og_image: page.ogImage,
              updated_at: new Date().toISOString(),
            })
            .eq("path", page.id)
        : await supabase
            .from(page.table)
            .update({
              seo: {
                title: page.title,
                description: page.description,
                ogImage: page.ogImage,
              },
            })
            .eq("id", page.id);
    setSavingPath(null);

    if (error) {
      setSaveError(error.message);
      return;
    }
    setSavedPath(page.path);
    window.setTimeout(() => setSavedPath(null), 2000);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
          <span className="text-xs text-gray-400">({pages.length})</span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{note}</p>
      </div>
      <div className="divide-y divide-gray-100">
        {pages.map((page, idx) => {
          const issues = seoIssues(page);
          const score = seoScore(page);
          const open = editKey === page.path;
          return (
            <div key={page.path} className="px-5 py-4">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="font-mono text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded shrink-0 max-w-[240px] truncate">
                    {page.path}
                  </span>
                  <span className="font-medium text-gray-900 text-sm truncate">
                    {page.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                  {page.table && (
                    <button
                      onClick={() => persist(page)}
                      disabled={savingPath === page.path}
                      className="text-xs font-medium px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                    >
                      {savingPath === page.path
                        ? "Menyimpan…"
                        : savedPath === page.path
                          ? "Tersimpan ✓"
                          : "Simpan"}
                    </button>
                  )}
                  <button
                    onClick={() => setEditKey(open ? null : page.path)}
                    className="text-xs text-emerald-600 hover:underline"
                  >
                    {open ? "Tutup" : "Edit"}
                  </button>
                </div>
              </div>

              {saveError && savingPath === null && (
                <p className="text-xs text-red-600 mb-2">{saveError}</p>
              )}

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

              {/* Google preview */}
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

              {open && (
                <div className="mt-3 space-y-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Meta Title{" "}
                      <span
                        className={
                          page.title.length > TITLE_MAX
                            ? "text-red-500"
                            : "text-gray-400"
                        }
                      >
                        ({page.title.length}/{TITLE_MAX})
                      </span>
                    </label>
                    <input
                      value={page.title}
                      onChange={(e) => update(idx, "title", e.target.value)}
                      maxLength={90}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Meta Description{" "}
                      <span
                        className={
                          page.description.length > DESC_MAX
                            ? "text-red-500"
                            : "text-gray-400"
                        }
                      >
                        ({page.description.length}/{DESC_MAX})
                      </span>
                    </label>
                    <textarea
                      value={page.description}
                      onChange={(e) =>
                        update(idx, "description", e.target.value)
                      }
                      maxLength={220}
                      rows={2}
                      className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none text-sm resize-none"
                    />
                  </div>
                  <ImageUpload
                    label="OG Image"
                    value={page.ogImage}
                    onChange={(url) => update(idx, "ogImage", url)}
                    hint="Muncul saat halaman dibagikan ke media sosial."
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
