"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useMemo, useRef, useState } from "react";
import { articles as seedArticles, Article, readMinutes, slugify } from "@/data/news";
import ImageUpload from "@/components/admin/ImageUpload";
import { useCollection } from "@/lib/use-collection";
import { removeContentImage } from "@/lib/content-images";
import DbStatus from "@/components/admin/DbStatus";
import AdminSearch from "@/components/admin/AdminSearch";
import { matchesQuery } from "@/lib/search";
import {
  Plus,
  Pencil,
  Eye,
  EyeOff,
  Trash2,
  X,
  Image as ImageIcon,
  Pin,
  Tag,
  AlertTriangle,
  Loader2,
  Bold,
  Italic,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Link2,
  Copy,
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
  const { items, loading, live, error, saving, save, remove } = useCollection<Article>(
    "articles",
    seedArticles,
    {
      orderBy: "published_at",
      ascending: false,
      revalidate: (row) => ["/", "/berita", ...(row?.slug ? [`/berita/${row.slug}`] : [])],
    }
  );

  // Kategori = tabel content_categories (bisa ditambah pengurus). Nama
  // kategori disimpan sebagai teks di articles.category.
  const { items: categories, save: saveCategory } = useCollection<Category>(
    "content_categories",
    SEED_CATEGORIES,
    { orderBy: "order_index", ascending: true }
  );

  const [editing, setEditing] = useState<{ article: Article; isNew: boolean } | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [q, setQ] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "draft" | "pinned">("all");

  const isPublished = (a: Article) => a.is_published !== false;

  const filterOptions = useMemo(
    () =>
      [...new Set([...categories.map((c) => c.name), ...items.map((a) => a.category)])]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, "id")),
    [categories, items]
  );

  const counts = useMemo(
    () => ({
      all: items.length,
      published: items.filter(isPublished).length,
      draft: items.filter((a) => !isPublished(a)).length,
      pinned: items.filter((a) => a.is_pinned).length,
    }),
    [items]
  );

  const shown = useMemo(
    () =>
      [...items]
        .sort(
          (a, b) =>
            Number(b.is_pinned) - Number(a.is_pinned) ||
            b.published_at.localeCompare(a.published_at)
        )
        .filter(
          (a) =>
            (!categoryFilter || a.category === categoryFilter) &&
            (status === "all" ||
              (status === "published" && isPublished(a)) ||
              (status === "draft" && !isPublished(a)) ||
              (status === "pinned" && a.is_pinned)) &&
            matchesQuery(q, a.title, a.slug, a.author, a.excerpt, a.published_at, ...(a.tags ?? []))
        ),
    [items, q, categoryFilter, status]
  );

  const handleSave = async (article: Article): Promise<boolean> => {
    if (!(await save(article))) return false;
    setEditing(null);
    return true;
  };

  const quickUpdate = (a: Article, patch: Partial<Article>) => save({ ...a, ...patch });

  const handleDelete = async (id: string) => {
    const article = items.find((a) => a.id === id);
    setDeleting(true);
    const ok = await remove(id);
    setDeleting(false);
    if (!ok) return;
    setDeleteId(null);
    // Upload bersifat content-addressed: hapus file hanya bila tidak dipakai
    // artikel lain.
    const stillUsed = items.some((a) => a.id !== id && a.image === article?.image);
    if (!stillUsed) void removeContentImage(article?.image);
  };

  const blank = (): Article => ({
    id: `news-${Date.now().toString(36)}`,
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
    is_published: true,
    published_at: new Date().toISOString().slice(0, 10),
  });

  const duplicate = (a: Article) =>
    setEditing({
      isNew: true,
      article: {
        ...a,
        id: `news-${Date.now().toString(36)}`,
        title: `${a.title} (Salinan)`,
        slug: `${a.slug}-salinan`,
        is_pinned: false,
        is_published: false,
        published_at: new Date().toISOString().slice(0, 10),
      },
    });

  const STATUS_TABS: { key: typeof status; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: counts.all },
    { key: "published", label: "Terbit", count: counts.published },
    { key: "draft", label: "Draft", count: counts.draft },
    { key: "pinned", label: "Disorot", count: counts.pinned },
  ];

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Berita</h1>
          <p className="mt-1 text-sm text-gray-500">Tulis, jadwalkan, dan sorot kabar kegiatan HMTL.</p>
        </div>
        <div className="flex items-center gap-3">
          <DbStatus live={live} loading={loading} error={error} saving={saving} />
          <button
            onClick={() => setEditing({ article: blank(), isNew: true })}
            className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
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
      </AdminSearch>

      <div className="-mt-1 mb-4 flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Status artikel">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={status === t.key}
            onClick={() => setStatus(t.key)}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${
              status === t.key
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            }`}
          >
            {t.label}
            {t.count > 0 && <span className={status === t.key ? "text-emerald-100" : "text-gray-400"}>{t.count}</span>}
          </button>
        ))}
      </div>

      {!loading && shown.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white px-5 py-12 text-center">
          <p className="text-sm text-gray-500">
            {items.length === 0 ? "Belum ada artikel. Mulai tulis kabar kegiatan pertama." : "Tidak ada artikel yang cocok."}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => setEditing({ article: blank(), isNew: true })}
              className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" /> Tulis Artikel
            </button>
          )}
        </div>
      )}

      {shown.length > 0 && (
        <ul className="grid gap-3">
          {shown.map((a) => {
            const published = isPublished(a);
            const scheduled = published && a.published_at > new Date().toISOString().slice(0, 10);
            return (
              <li
                key={a.id}
                className={`flex flex-col gap-3 rounded-xl border bg-white p-3 sm:flex-row sm:items-center sm:p-4 ${
                  published ? "border-gray-200" : "border-dashed border-gray-300 bg-gray-50/60"
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="grid h-16 w-24 shrink-0 place-items-center overflow-hidden rounded-lg border border-gray-200 bg-gray-100 text-gray-300">
                    {a.image ? (
                      <img src={a.image} alt="" className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <ImageIcon className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-1.5">
                      {a.is_pinned && <Pin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" aria-label="Disorot" />}
                      <span className="line-clamp-2 font-semibold leading-snug text-gray-900">{a.title || "(Tanpa judul)"}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
                      <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-medium text-emerald-800">{a.category}</span>
                      <span>
                        {new Date(a.published_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      <span>· {a.author}</span>
                      {!published && <span className="rounded bg-gray-200 px-1.5 py-0.5 font-medium text-gray-700">Draft</span>}
                      {scheduled && <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-800">Terjadwal</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-0.5 border-t border-gray-100 pt-2 sm:border-0 sm:pt-0">
                  <IconBtn
                    label={a.is_pinned ? "Lepas sorotan" : "Sorot di beranda"}
                    onClick={() => quickUpdate(a, { is_pinned: !a.is_pinned })}
                    active={a.is_pinned}
                  >
                    <Pin className={`h-4 w-4 ${a.is_pinned ? "text-emerald-600" : ""}`} />
                  </IconBtn>
                  <IconBtn
                    label={published ? "Jadikan draft" : "Terbitkan"}
                    onClick={() => quickUpdate(a, { is_published: !published })}
                  >
                    {published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </IconBtn>
                  <IconBtn label="Duplikat artikel" onClick={() => duplicate(a)}>
                    <Copy className="h-4 w-4" />
                  </IconBtn>
                  {published && (
                    <Link
                      href={`/berita/${a.slug}`}
                      target="_blank"
                      title="Lihat di website"
                      aria-label="Lihat di website"
                      className="grid h-10 w-10 place-items-center rounded-lg text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                    >
                      <Link2 className="h-4 w-4" />
                    </Link>
                  )}
                  <IconBtn label="Edit artikel" onClick={() => setEditing({ article: a, isNew: false })}>
                    <Pencil className="h-4 w-4" />
                  </IconBtn>
                  <IconBtn label="Hapus artikel" danger onClick={() => setDeleteId(a.id)}>
                    <Trash2 className="h-4 w-4" />
                  </IconBtn>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <ArticleModal
          article={editing.article}
          isNew={editing.isNew}
          categories={categories}
          takenSlugs={items.filter((a) => a.id !== editing.article.id).map((a) => a.slug)}
          saveError={error}
          onAddCategory={async (name) => {
            const existing = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
            if (existing) return existing.name;
            await saveCategory({ id: `cat-${Date.now().toString(36)}`, name, order_index: categories.length });
            return name;
          }}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}

      {deleteId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <Trash2 className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <h3 className="mb-1 font-bold text-gray-900">Hapus artikel?</h3>
            <p className="mb-5 text-sm text-gray-500">
              &quot;{items.find((a) => a.id === deleteId)?.title}&quot; dan foto sampulnya dihapus permanen.
              Kalau hanya ingin menyembunyikan, jadikan Draft.
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
                onClick={() => handleDelete(deleteId)}
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
  danger,
  active,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      aria-pressed={active}
      className={`grid h-10 w-10 place-items-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 ${
        danger ? "hover:text-red-600" : "hover:text-gray-800"
      }`}
    >
      {children}
    </button>
  );
}

/** Sisipkan tag HTML di sekitar teks terpilih pada textarea konten. */
function wrapSelection(
  el: HTMLTextAreaElement,
  before: string,
  after: string,
  placeholder: string
): { value: string; caret: [number, number] } {
  const { selectionStart: s, selectionEnd: e, value } = el;
  const picked = value.slice(s, e) || placeholder;
  const next = value.slice(0, s) + before + picked + after + value.slice(e);
  return { value: next, caret: [s + before.length, s + before.length + picked.length] };
}

const EXCERPT_IDEAL = 160;

/** Tombol format konten: tag pembuka, penutup, dan teks contoh. */
const TOOLBAR = [
  { icon: Heading2, label: "Subjudul", wrap: ["<h2>", "</h2>", "Subjudul"] },
  { icon: Bold, label: "Tebal", wrap: ["<strong>", "</strong>", "teks tebal"] },
  { icon: Italic, label: "Miring", wrap: ["<em>", "</em>", "teks miring"] },
  { icon: List, label: "Daftar poin", wrap: ["<ul>\n  <li>", "</li>\n</ul>", "poin"] },
  { icon: ListOrdered, label: "Daftar bernomor", wrap: ["<ol>\n  <li>", "</li>\n</ol>", "langkah"] },
  { icon: Quote, label: "Kutipan", wrap: ["<blockquote>", "</blockquote>", "kutipan"] },
  { icon: Link2, label: "Tautan", wrap: null },
] as const;

function ArticleModal({
  article,
  isNew,
  categories,
  takenSlugs,
  saveError,
  onAddCategory,
  onSave,
  onClose,
}: {
  article: Article;
  isNew: boolean;
  categories: Category[];
  takenSlugs: string[];
  saveError: string | null;
  onAddCategory: (name: string) => Promise<string>;
  onSave: (a: Article) => Promise<boolean>;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Article>(() => ({
    ...article,
    tags: article.tags ?? [],
    is_published: article.is_published !== false,
  }));
  const [slugTouched, setSlugTouched] = useState(!isNew || !!article.slug);
  const [tagInput, setTagInput] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);
  const [tab, setTab] = useState<"write" | "preview">("write");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const dialogRef = useRef<HTMLFormElement>(null);

  const [initial] = useState(() => JSON.stringify(form));
  const dirty = JSON.stringify(form) !== initial;

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

  const set = <K extends keyof Article>(key: K, val: Article[K]) =>
    setForm((prev) => ({
      ...prev,
      [key]: val,
      ...(key === "title" && !slugTouched ? { slug: slugify(val as string) } : {}),
    }));

  const addTag = () => {
    const parts = tagInput.split(",").map((t) => t.trim()).filter(Boolean);
    if (parts.length) {
      const next = [...form.tags];
      for (const t of parts) if (!next.some((x) => x.toLowerCase() === t.toLowerCase())) next.push(t);
      set("tags", next.slice(0, 12));
    }
    setTagInput("");
  };

  const addCategory = async () => {
    const name = newCategory.trim();
    if (!name) return;
    setAddingCategory(true);
    const saved = await onAddCategory(name);
    setAddingCategory(false);
    set("category", saved);
    setNewCategory("");
  };

  const format = (before: string, after: string, placeholder: string) => {
    const el = contentRef.current;
    if (!el) return;
    const { value, caret } = wrapSelection(el, before, after, placeholder);
    set("content", value);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret[0], caret[1]);
    });
  };

  const insertLink = () => {
    const url = window.prompt("Alamat tautan (https://… atau /halaman):", "https://");
    if (!url || url === "https://") return;
    format(`<a href="${url.replace(/"/g, "&quot;")}">`, "</a>", "teks tautan");
  };

  const field =
    "w-full min-h-11 rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200";
  const labelCls = "mb-1 block text-sm font-medium text-gray-700";
  const minutes = readMinutes(form.content);
  const excerptLen = form.excerpt.trim().length;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const title = form.title.trim();
    const slug = slugify(form.slug || title).replace(/^-|-$/g, "");
    const problems: string[] = [];
    if (!title) problems.push("Judul wajib diisi.");
    if (!slug) problems.push("Slug tidak valid.");
    if (takenSlugs.includes(slug)) problems.push(`Slug "${slug}" sudah dipakai artikel lain.`);
    if (!form.published_at) problems.push("Tanggal terbit wajib diisi.");
    if (form.is_published !== false && !form.content.trim()) problems.push("Konten masih kosong. Simpan sebagai Draft dulu bila belum selesai.");
    const cta = [form.cta_label?.trim(), form.cta_url?.trim()];
    if ((cta[0] && !cta[1]) || (!cta[0] && cta[1])) problems.push("Tombol akhir artikel butuh nama dan link sekaligus, atau kosongkan keduanya.");
    if (cta[1] && !/^(https?:\/\/|\/)/.test(cta[1])) problems.push("Link tombol harus diawali https:// atau /.");
    if (problems.length) {
      setFormError(problems.join(" "));
      dialogRef.current?.querySelector("[data-scroll]")?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setSaving(true);
    const ok = await onSave({
      ...form,
      title,
      slug,
      excerpt: form.excerpt.trim(),
      author: form.author.trim() || "Tim Kominfo",
      image_alt: form.image_alt.trim() || title,
      read_minutes: readMinutes(form.content),
      cta_label: cta[0] || undefined,
      cta_url: cta[1] || undefined,
    });
    setSaving(false);
    if (!ok) setFormError(saveError ? `Gagal menyimpan: ${saveError}` : "Gagal menyimpan. Coba lagi.");
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
        noValidate
        role="dialog"
        aria-modal="true"
        aria-labelledby="article-modal-title"
        className="flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-3xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h3 id="article-modal-title" className="truncate text-lg font-bold text-gray-900">
            {isNew ? "Artikel baru" : "Edit artikel"}
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

        <div data-scroll className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-5 py-5">
          {formError && (
            <div role="alert" className="flex gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label htmlFor="am-title" className={labelCls}>Judul</label>
            <input
              id="am-title"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={160}
              placeholder="HMTL UNTAN Gelar Aksi Bersih Sungai Kapuas"
              className={field}
            />
          </div>

          <div>
            <label htmlFor="am-slug" className={labelCls}>Alamat halaman</label>
            <div className="flex min-h-11 items-center rounded-lg border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200">
              <span className="pl-3 text-sm text-gray-400">/berita/</span>
              <input
                id="am-slug"
                value={form.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", e.target.value);
                }}
                placeholder={slugify(form.title) || "otomatis dari judul"}
                className="min-w-0 flex-1 bg-transparent py-2 pr-3 font-mono text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="am-cat" className={labelCls}>Kategori</label>
              <select
                id="am-cat"
                value={form.category}
                onChange={(e) => set("category", e.target.value)}
                className={field}
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
            </div>
            <div>
              <label htmlFor="am-author" className={labelCls}>Penulis</label>
              <input
                id="am-author"
                value={form.author}
                onChange={(e) => set("author", e.target.value)}
                maxLength={60}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="am-date" className={labelCls}>Tanggal terbit</label>
              <input
                id="am-date"
                type="date"
                value={form.published_at}
                onChange={(e) => set("published_at", e.target.value)}
                className={field}
              />
            </div>
          </div>
          <div className="-mt-2 flex gap-1.5">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void addCategory();
                }
              }}
              maxLength={40}
              placeholder="Kategori baru…"
              aria-label="Nama kategori baru"
              className="min-h-10 w-full max-w-xs rounded-lg border border-gray-200 px-3 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="button"
              onClick={addCategory}
              disabled={!newCategory.trim() || addingCategory}
              className="min-h-10 shrink-0 rounded-lg border border-emerald-600 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
            >
              Tambah kategori
            </button>
          </div>

          <ImageUpload
            label="Foto sampul"
            value={form.image}
            hint="Rasio asli foto dipertahankan di halaman berita."
            onChange={(url, size) =>
              setForm((prev) => ({
                ...prev,
                image: url,
                image_width: size?.width ?? null,
                image_height: size?.height ?? null,
              }))
            }
          />
          {form.image && (
            <div className="-mt-2">
              <label htmlFor="am-alt" className={labelCls}>Keterangan foto</label>
              <input
                id="am-alt"
                value={form.image_alt}
                onChange={(e) => set("image_alt", e.target.value)}
                maxLength={140}
                placeholder="Apa yang terlihat di foto (untuk pembaca layar & Google)"
                className={field}
              />
            </div>
          )}

          <div>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <label htmlFor="am-excerpt" className="text-sm font-medium text-gray-700">Ringkasan</label>
              <span className={`text-xs tabular-nums ${excerptLen > EXCERPT_IDEAL ? "text-amber-700" : "text-gray-400"}`}>
                {excerptLen}/{EXCERPT_IDEAL}
              </span>
            </div>
            <textarea
              id="am-excerpt"
              value={form.excerpt}
              onChange={(e) => set("excerpt", e.target.value)}
              rows={2}
              placeholder="1–2 kalimat yang muncul di daftar berita dan hasil Google."
              className={`${field} resize-y py-2.5`}
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-gray-700">Konten</span>
              <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs" role="tablist">
                {(["write", "preview"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    role="tab"
                    aria-selected={tab === t}
                    onClick={() => setTab(t)}
                    className={`min-h-8 rounded-md px-3 font-medium ${tab === t ? "bg-gray-900 text-white" : "text-gray-600"}`}
                  >
                    {t === "write" ? "Tulis" : "Pratinjau"}
                  </button>
                ))}
              </div>
            </div>
            {tab === "write" ? (
              <div className="overflow-hidden rounded-lg border border-gray-200 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200">
                <div className="flex flex-wrap gap-0.5 border-b border-gray-100 bg-gray-50 p-1">
                  {TOOLBAR.map((b) => (
                    <button
                      key={b.label}
                      type="button"
                      onClick={() => (b.wrap ? format(b.wrap[0], b.wrap[1], b.wrap[2]) : insertLink())}
                      title={b.label}
                      aria-label={b.label}
                      className="grid h-9 w-9 place-items-center rounded text-gray-600 hover:bg-white hover:text-gray-900"
                    >
                      <b.icon className="h-4 w-4" />
                    </button>
                  ))}
                </div>
                <textarea
                  ref={contentRef}
                  value={form.content}
                  onChange={(e) => set("content", e.target.value)}
                  rows={12}
                  aria-label="Konten artikel (HTML)"
                  placeholder={"<p>Paragraf pertama…</p>\n<h2>Subjudul</h2>\n<p>Paragraf berikutnya…</p>"}
                  className="block w-full resize-y px-3 py-2.5 font-mono text-[13px] leading-relaxed outline-none"
                />
              </div>
            ) : (
              <div
                className="prose-article min-h-48 rounded-lg border border-gray-200 px-4 py-3"
                // Pratinjau di panel admin hanya untuk pengurus yang menulisnya;
                // halaman publik tetap melewati sanitizeArticleHtml di server.
                dangerouslySetInnerHTML={{
                  __html: form.content.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/\son\w+="[^"]*"/gi, "") ||
                    '<p style="color:#9ca3af">Belum ada konten.</p>',
                }}
              />
            )}
            <p className="mt-1 text-xs text-gray-500">± {minutes} menit baca. Pilih teks lalu klik tombol format.</p>
          </div>

          <div>
            <label htmlFor="am-tag" className={labelCls}>Tag</label>
            <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-200">
              {form.tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800">
                  <Tag className="h-3 w-3" />
                  {t}
                  <button
                    type="button"
                    onClick={() => set("tags", form.tags.filter((x) => x !== t))}
                    aria-label={`Hapus tag ${t}`}
                    className="text-emerald-600 hover:text-emerald-900"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="am-tag"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === ",") {
                    e.preventDefault();
                    addTag();
                  } else if (e.key === "Backspace" && !tagInput && form.tags.length) {
                    set("tags", form.tags.slice(0, -1));
                  }
                }}
                onBlur={addTag}
                placeholder={form.tags.length ? "" : "Ketik lalu Enter: lingkungan, seminar…"}
                className="min-w-[10ch] flex-1 border-none p-1 text-sm outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <span className="text-sm font-medium text-gray-700">Tombol di akhir artikel</span>
              <span className="ml-1 text-xs text-gray-400">opsional</span>
            </div>
            <div>
              <label htmlFor="am-cta-l" className={labelCls}>Nama tombol</label>
              <input
                id="am-cta-l"
                value={form.cta_label ?? ""}
                onChange={(e) => set("cta_label", e.target.value)}
                maxLength={40}
                placeholder="Daftar Sekarang"
                className={field}
              />
            </div>
            <div>
              <label htmlFor="am-cta-u" className={labelCls}>Link tujuan</label>
              <input
                id="am-cta-u"
                value={form.cta_url ?? ""}
                onChange={(e) => set("cta_url", e.target.value)}
                placeholder="https://… atau /merchandise"
                className={`${field} font-mono`}
              />
            </div>
          </div>

          <div className="grid gap-2 border-t border-gray-100 pt-4 sm:grid-cols-2">
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
              <input
                type="checkbox"
                checked={form.is_published !== false}
                onChange={(e) => set("is_published", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-emerald-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Terbitkan</span>
                <span className="block text-xs text-gray-500">Matikan untuk menyimpan sebagai Draft (tidak tampil di website).</span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 p-3 hover:border-gray-300">
              <input
                type="checkbox"
                checked={form.is_pinned}
                onChange={(e) => set("is_pinned", e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-emerald-600"
              />
              <span>
                <span className="block text-sm font-medium text-gray-900">Sorot</span>
                <span className="block text-xs text-gray-500">Tampil paling depan di beranda dan halaman Berita.</span>
              </span>
            </label>
          </div>
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
            {saving ? "Menyimpan…" : form.is_published === false ? "Simpan draft" : isNew ? "Terbitkan" : "Simpan perubahan"}
          </button>
        </div>
      </form>
    </div>
  );
}
