/**
 * Per-page SEO overrides.
 *
 * Detail pages (a product, an article) derive sensible meta tags from their
 * own content. When an editor wants something different for search results
 * they set an override in /admin/seo, and that wins. Empty fields fall
 * straight back to the derived value, so a half-filled override is safe.
 */
export interface SeoOverride {
  title?: string;
  description?: string;
  ogImage?: string;
}

export interface ResolvedSeo {
  title: string;
  description: string;
  ogImage: string;
}

export const SITE_NAME = "HIMA Teknik Lingkungan UNTAN";
export const SITE_URL = "https://hima.tekniklingkungan.com";

/** Author override wins per-field; anything blank falls back to content. */
export function resolveSeo(
  override: SeoOverride | undefined,
  fallback: ResolvedSeo
): ResolvedSeo {
  return {
    title: override?.title?.trim() || fallback.title,
    description: override?.description?.trim() || fallback.description,
    ogImage: override?.ogImage?.trim() || fallback.ogImage,
  };
}

/** Google truncates around these lengths — the admin surfaces them as hints. */
export const TITLE_MAX = 60;
export const DESC_MAX = 160;

export function seoIssues(s: {
  title: string;
  description: string;
  ogImage: string;
}): string[] {
  const issues: string[] = [];

  if (!s.title) issues.push("Title kosong");
  else if (s.title.length > TITLE_MAX)
    issues.push(`Title terlalu panjang (${s.title.length}/${TITLE_MAX})`);
  else if (s.title.length < 20) issues.push("Title terlalu pendek");

  if (!s.description) issues.push("Description kosong");
  else if (s.description.length > DESC_MAX)
    issues.push(
      `Description terlalu panjang (${s.description.length}/${DESC_MAX})`
    );
  else if (s.description.length < 50) issues.push("Description terlalu pendek");

  if (!s.ogImage) issues.push("OG Image belum diset");

  return issues;
}

export function seoScore(s: {
  title: string;
  description: string;
  ogImage: string;
}): number {
  const max = 3;
  const issues = seoIssues(s).length;
  return Math.round(((max - Math.min(issues, max)) / max) * 100);
}
