import { Metadata } from "next";
import { getArticles, getSiteMeta } from "@/lib/content-repo";
import ArticleBrowser, { type ArticleCard } from "./ArticleBrowser";

// Editable in /admin/seo — falls back to the previous hardcoded values.
export async function generateMetadata(): Promise<Metadata> {
  const meta = await getSiteMeta("/berita");
  return {
    title: { absolute: meta.title },
    description: meta.description,
    alternates: { canonical: "/berita" },
    openGraph: {
      title: meta.title,
      description: meta.description,
      ...(meta.ogImage && { images: [{ url: meta.ogImage }] }),
    },
  };
}


// Read fresh at most once a minute so stock and new content appear
// without a redeploy.
export const revalidate = 60;

export default async function BeritaPage() {
  const articles = await getArticles();
  const sorted = [...articles].sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );
  // Tanggal diformat di server dengan zona waktu WIB, supaya teks di HTML
  // server dan di browser sama persis (tidak ada hydration mismatch).
  const fmt = (iso: string, month: "long" | "short") =>
    new Date(iso).toLocaleDateString("id-ID", {
      day: "numeric",
      month,
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  const cards: ArticleCard[] = sorted.map((a) => ({
    id: a.id,
    slug: a.slug,
    title: a.title,
    excerpt: a.excerpt,
    category: a.category,
    image: a.image,
    image_alt: a.image_alt,
    image_width: a.image_width,
    image_height: a.image_height,
    dateLong: fmt(a.published_at, "long"),
    dateShort: fmt(a.published_at, "short"),
    year: new Date(a.published_at).getFullYear().toString(),
  }));

  return (
    <div
      style={{
        background: "#ffffff",
        minHeight: "100vh",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "64px clamp(16px,3vw,40px) 88px",
        }}
      >
        {/* Header */}
        <div className="scroll-reveal" style={{ marginBottom: 48 }}>
          <p
            style={{
              margin: "0 0 14px",
              fontSize: 11,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "#7a8450",
            }}
          >
            Berita &amp; Kegiatan
          </p>
          <h1
            style={{
              margin: 0,
              fontSize: "clamp(36px,5vw,64px)",
              fontWeight: 700,
              letterSpacing: "-.01em",
              lineHeight: 0.95,
            }}
          >
            Kabar Terbaru
          </h1>
          <p
            style={{
              margin: "18px 0 0",
              fontSize: 18,
              lineHeight: 1.55,
              color: "#605d5d",
              maxWidth: "52ch",
            }}
          >
            Liputan kegiatan, prestasi, dan informasi terkini dari HIMA
            Teknik Lingkungan UNTAN.
          </p>
        </div>

        <ArticleBrowser articles={cards} />
      </div>
    </div>
  );
}
