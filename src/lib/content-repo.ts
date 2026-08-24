import { getServerSupabase } from "./supabase";

import { products as seedProducts, type Product } from "@/data/products";
import { articles as seedArticles, type Article } from "@/data/news";
import { departments as seedDepartments, type Department } from "@/data/departments";
import { partners as seedPartners, type Partner } from "@/data/partners";
import { ads as seedAds, type Ad } from "@/data/ads";

/**
 * Content reads for server components.
 *
 * Every function returns database rows when Supabase is configured and the
 * query succeeds, and the seeded TypeScript collection otherwise. That
 * fallback is what lets the site run on a fresh clone with no `.env.local`,
 * and keeps a database blip from turning into a blank page.
 *
 * Shapes returned here match the original TypeScript interfaces exactly, so
 * the components that render them did not have to change.
 */

// ---------------------------------------------------------------- products

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
  seo: Product["seo"] | null;
}

function toProduct(r: ProductRow): Product {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    price: r.price,
    images: [{ url: "", alt_text: r.name }],
    stock_type: r.stock_type,
    stock: r.stock,
    stock_reserved: r.stock_reserved,
    variants:
      r.variant_name && r.variant_options?.length
        ? { name: r.variant_name, options: r.variant_options }
        : null,
    po_quota: r.po_quota,
    po_filled: r.po_filled,
    po_reserved: r.po_reserved,
    po_deadline: r.po_deadline,
    seo: r.seo ?? undefined,
  };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = getServerSupabase();
  if (!supabase) return seedProducts;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  // Only a failed query falls back to seed data — a real empty result (the
  // last product got unpublished or deleted) must render as an empty
  // catalogue, not resurrect the old demo seed content.
  if (error) return seedProducts;
  return (data as ProductRow[]).map(toProduct);
}

export async function getProductBySlug(slug: string): Promise<Product | null> {
  const supabase = getServerSupabase();
  if (!supabase) return seedProducts.find((p) => p.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .maybeSingle();

  if (error) return seedProducts.find((p) => p.slug === slug) ?? null;
  return data ? toProduct(data as ProductRow) : null;
}

// ---------------------------------------------------------------- articles

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  image: string | null;
  image_alt: string | null;
  published_at: string;
  cta_label: string | null;
  cta_url: string | null;
  seo: Article["seo"] | null;
}

function toArticle(r: ArticleRow): Article {
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    excerpt: r.excerpt,
    content: r.content,
    category: r.category,
    author: r.author,
    image: r.image ?? "",
    image_alt: r.image_alt ?? "",
    published_at: r.published_at,
    cta_label: r.cta_label ?? undefined,
    cta_url: r.cta_url ?? undefined,
    seo: r.seo ?? undefined,
  };
}

export async function getArticles(): Promise<Article[]> {
  const supabase = getServerSupabase();
  if (!supabase) return seedArticles;

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("is_published", true)
    .order("published_at", { ascending: false });

  if (error) return seedArticles;
  return (data as ArticleRow[]).map(toArticle);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const supabase = getServerSupabase();
  if (!supabase) return seedArticles.find((a) => a.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("articles")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .maybeSingle();

  if (error) return seedArticles.find((a) => a.slug === slug) ?? null;
  return data ? toArticle(data as ArticleRow) : null;
}

// ------------------------------------------------------------- departments

interface DepartmentRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  order_index: number;
  periods: {
    id: string;
    department_id: string;
    period_label: string;
    is_active: boolean;
    start_date: string | null;
    end_date: string | null;
    members: {
      id: string;
      name: string;
      position: string;
      photo: string | null;
      contact: string | null;
      order_index: number;
    }[];
  }[];
}

function toDepartment(r: DepartmentRow): Department {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    description: r.description,
    icon: r.icon,
    periods: [...(r.periods ?? [])]
      // Active period first, then most recent label.
      .sort((a, b) =>
        a.is_active === b.is_active
          ? b.period_label.localeCompare(a.period_label)
          : a.is_active
            ? -1
            : 1
      )
      .map((p) => ({
        id: p.id,
        department_id: p.department_id,
        period_label: p.period_label,
        is_active: p.is_active,
        start_date: p.start_date ?? "",
        end_date: p.end_date ?? "",
        members: [...(p.members ?? [])]
          .sort((a, b) => a.order_index - b.order_index)
          .map((m) => ({
            id: m.id,
            name: m.name,
            position: m.position,
            photo: m.photo ?? "",
            contact: m.contact ?? undefined,
            order_index: m.order_index,
          })),
      })),
  };
}

const DEPARTMENT_SELECT =
  "*, periods:department_periods(*, members:department_members(*))";

export async function getDepartments(): Promise<Department[]> {
  const supabase = getServerSupabase();
  if (!supabase) return seedDepartments;

  const { data, error } = await supabase
    .from("departments")
    .select(DEPARTMENT_SELECT)
    .order("order_index", { ascending: true });

  if (error) return seedDepartments;
  return (data as unknown as DepartmentRow[]).map(toDepartment);
}

export async function getDepartmentBySlug(
  slug: string
): Promise<Department | null> {
  const supabase = getServerSupabase();
  if (!supabase) return seedDepartments.find((d) => d.slug === slug) ?? null;

  const { data, error } = await supabase
    .from("departments")
    .select(DEPARTMENT_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) return seedDepartments.find((d) => d.slug === slug) ?? null;
  return data ? toDepartment(data as unknown as DepartmentRow) : null;
}

// ---------------------------------------------------------------- partners

export async function getPartners(): Promise<Partner[]> {
  const supabase = getServerSupabase();
  if (!supabase) return seedPartners;

  const { data, error } = await supabase
    .from("partners")
    .select("*")
    .eq("is_active", true)
    .order("order_index", { ascending: true });

  if (error) return seedPartners;
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    logo: (r.logo as string) ?? "",
    description: r.description as string,
    website: (r.website as string) ?? null,
    type: r.type as Partner["type"],
  }));
}

// -------------------------------------------------------------------- ads

export async function getActiveAds(): Promise<Ad[]> {
  const supabase = getServerSupabase();
  if (!supabase) return seedAds.filter((a) => a.active);

  const { data, error } = await supabase
    .from("ads")
    .select("*")
    .eq("active", true)
    .order("order_index", { ascending: true });

  if (error) return seedAds.filter((a) => a.active);
  return data.map((r) => ({
    id: r.id as string,
    name: r.name as string,
    blurb: (r.blurb as string) ?? "",
    logo: (r.logo as string) ?? "",
    website: r.website as string,
    active: r.active as boolean,
    order: r.order_index as number,
  }));
}

// --------------------------------------------------------------- site meta

export interface SiteMeta {
  path: string;
  label: string;
  title: string;
  description: string;
  ogImage: string;
}

/** Fallbacks used when Supabase is unconfigured or a path has no row yet. */
const SITE_META_FALLBACK: Record<string, { title: string; description: string }> = {
  "/": {
    title: "HIMA Teknik Lingkungan UNTAN",
    description:
      "Website resmi Himpunan Mahasiswa Teknik Lingkungan, Universitas Tanjungpura, Pontianak.",
  },
  "/tentang": {
    title: "Tentang — HIMA Teknik Lingkungan UNTAN",
    description:
      "Profil dan sejarah Himpunan Mahasiswa Teknik Lingkungan Universitas Tanjungpura.",
  },
  "/departemen": {
    title: "Departemen — HIMA Teknik Lingkungan UNTAN",
    description: "Struktur organisasi dan departemen HIMA Teknik Lingkungan UNTAN.",
  },
  "/merchandise": {
    title: "Merchandise — HIMA Teknik Lingkungan UNTAN",
    description:
      "Etalase merchandise resmi HMTL UNTAN — kaos, jaket, hoodie, dan lainnya.",
  },
  "/berita": {
    title: "Berita — HIMA Teknik Lingkungan UNTAN",
    description:
      "Berita dan kabar terbaru dari HIMA Teknik Lingkungan Universitas Tanjungpura.",
  },
  "/kemitraan": {
    title: "Kemitraan — HIMA Teknik Lingkungan UNTAN",
    description:
      "Daftar mitra dan sponsor HIMA Teknik Lingkungan UNTAN serta pengajuan kerja sama.",
  },
  "/kontak": {
    title: "Kontak — HIMA Teknik Lingkungan UNTAN",
    description: "Hubungi HIMA Teknik Lingkungan UNTAN via WhatsApp atau Instagram.",
  },
  "/privasi": {
    title: "Kebijakan Privasi — HIMA Teknik Lingkungan UNTAN",
    description:
      "Data apa yang dikumpulkan situs HMTL UNTAN, untuk apa dipakai, dan siapa saja yang bisa mengaksesnya.",
  },
};

/**
 * Metadata for a page that is not a product or an article.
 *
 * These used to be hardcoded `export const metadata`, so editing them in
 * /admin/seo changed nothing. They come from `site_meta` now, with the
 * previous hardcoded values kept as the fallback.
 */
export async function getSiteMeta(path: string): Promise<SiteMeta> {
  const fallback = SITE_META_FALLBACK[path] ?? { title: "", description: "" };
  const base: SiteMeta = {
    path,
    label: path,
    title: fallback.title,
    description: fallback.description,
    ogImage: "",
  };

  const supabase = getServerSupabase();
  if (!supabase) return base;

  const { data, error } = await supabase
    .from("site_meta")
    .select("*")
    .eq("path", path)
    .maybeSingle();

  if (error || !data) return base;
  return {
    path,
    label: (data.label as string) ?? path,
    title: (data.title as string) || base.title,
    description: (data.description as string) || base.description,
    ogImage: (data.og_image as string) ?? "",
  };
}

/** Every static-page meta row — used by the dashboard's SEO screen. */
export async function getAllSiteMeta(): Promise<SiteMeta[]> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return Object.entries(SITE_META_FALLBACK).map(([path, v]) => ({
      path,
      label: path,
      title: v.title,
      description: v.description,
      ogImage: "",
    }));
  }

  const { data, error } = await supabase.from("site_meta").select("*").order("path");
  if (error || !data) return [];
  return data.map((r) => ({
    path: r.path as string,
    label: r.label as string,
    title: (r.title as string) ?? "",
    description: (r.description as string) ?? "",
    ogImage: (r.og_image as string) ?? "",
  }));
}
