import type { MetadataRoute } from "next";
import { articles } from "@/data/news";
import { products } from "@/data/products";
import { departments } from "@/data/departments";
import { SITE_URL } from "@/data/seo";

/**
 * Sitemap. Built from the same content collections the pages render, so a
 * new article or product appears here without anyone remembering to add it.
 *
 * Admin and cart routes are deliberately absent — they are either private
 * or per-visitor and have nothing to offer a crawler.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = [
    { path: "", priority: 1, freq: "weekly" as const },
    { path: "/tentang", priority: 0.8, freq: "monthly" as const },
    { path: "/departemen", priority: 0.8, freq: "monthly" as const },
    { path: "/merchandise", priority: 0.9, freq: "weekly" as const },
    { path: "/berita", priority: 0.9, freq: "daily" as const },
    { path: "/kemitraan", priority: 0.6, freq: "monthly" as const },
    { path: "/kontak", priority: 0.6, freq: "yearly" as const },
    { path: "/pesanan/cek", priority: 0.4, freq: "yearly" as const },
  ];

  const now = new Date();

  return [
    ...staticRoutes.map((r) => ({
      url: `${SITE_URL}${r.path}`,
      lastModified: now,
      changeFrequency: r.freq,
      priority: r.priority,
    })),
    ...articles.map((a) => ({
      url: `${SITE_URL}/berita/${a.slug}`,
      lastModified: new Date(a.published_at),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...products.map((p) => ({
      url: `${SITE_URL}/merchandise/${p.slug}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    ...departments.map((d) => ({
      url: `${SITE_URL}/departemen/${d.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
