/* eslint-disable @next/next/no-img-element */
import { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { articles, gdriveThumbnail } from "@/data/news";

export async function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      type: "article",
      publishedTime: article.published_at,
      ...(article.image &&
        article.image !== "/placeholder-news.png" && {
          images: [{ url: gdriveThumbnail(article.image, 1200) }],
        }),
    },
  };
}

export default async function ArticleDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const article = articles.find((a) => a.slug === slug);
  if (!article) notFound();

  const hasImage =
    article.image && article.image !== "/placeholder-news.png";

  return (
    <div style={{ background: "#f3f2f2", minHeight: "100vh" }}>
      <article
        style={{
          maxWidth: 820,
          margin: "0 auto",
          padding: "48px clamp(16px,3vw,40px) 88px",
        }}
      >
        {/* Back */}
        <Link
          href="/berita"
          className="beranda-hero-outline"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 2,
            fontSize: "11px",
            letterSpacing: ".12em",
            textTransform: "uppercase",
            marginBottom: 32,
          }}
        >
          &larr; Semua Berita
        </Link>

        {/* Meta */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "9.5px",
              letterSpacing: ".16em",
              textTransform: "uppercase",
              background: "#0088b0",
              color: "#f3f2f2",
              padding: "4px 10px",
              borderRadius: 2,
            }}
          >
            {article.category}
          </span>
          <span
            style={{
              fontSize: "11px",
              color: "#605d5d",
              letterSpacing: ".08em",
            }}
          >
            {new Date(article.published_at).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span style={{ fontSize: "11px", color: "#605d5d" }}>
            &middot; {article.author}
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            margin: 0,
            fontSize: "clamp(28px,4.5vw,48px)",
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: "-.025em",
          }}
        >
          {article.title}
        </h1>

        {/* Excerpt */}
        <p
          style={{
            margin: "20px 0 0",
            fontSize: 19,
            lineHeight: 1.55,
            color: "#605d5d",
          }}
        >
          {article.excerpt}
        </p>

        {/* Cover image */}
        {hasImage && (
          <figure
            style={{
              margin: "32px 0",
              position: "relative",
              aspectRatio: "16/9",
              overflow: "hidden",
              background: "#e0dede",
              border: "1px solid rgba(32,30,29,.16)",
              borderRadius: 2,
            }}
          >
            <img
              src={gdriveThumbnail(article.image, 1200)}
              alt={article.image_alt}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
            {article.image_alt && (
              <figcaption
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  right: 0,
                  padding: "8px 12px",
                  background: "rgba(243,242,242,.92)",
                  fontSize: 10,
                  letterSpacing: ".12em",
                  textTransform: "uppercase",
                  color: "#605d5d",
                  borderTop: "1px solid rgba(32,30,29,.16)",
                }}
              >
                {article.image_alt}
              </figcaption>
            )}
          </figure>
        )}

        {/* Content */}
        <div
          style={{
            marginTop: hasImage ? 0 : 32,
            paddingTop: hasImage ? 0 : 32,
            borderTop: hasImage ? undefined : "1px solid rgba(32,30,29,.16)",
          }}
        >
          <div
            className="prose-article"
            dangerouslySetInnerHTML={{ __html: article.content }}
            style={{
              fontSize: 17,
              lineHeight: 1.72,
              color: "#201e1d",
            }}
          />
        </div>

        {/* Related */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 32,
            borderTop: "1px solid rgba(32,30,29,.16)",
          }}
        >
          <h3
            style={{
              margin: "0 0 20px",
              fontSize: 11,
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "#0088b0",
            }}
          >
            Berita lainnya
          </h3>
          <div style={{ display: "grid", gap: 4 }}>
            {articles
              .filter((a) => a.id !== article.id)
              .slice(0, 3)
              .map((a) => (
                <Link
                  key={a.id}
                  href={`/berita/${a.slug}`}
                  className="beranda-news-row"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "100px 1fr",
                    gap: 20,
                    alignItems: "center",
                    padding: "16px 0",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10.5px",
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      color: "#605d5d",
                    }}
                  >
                    {new Date(a.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                    })}
                  </span>
                  <span
                    style={{
                      fontSize: 17,
                      fontWeight: 600,
                      lineHeight: 1.3,
                    }}
                  >
                    {a.title}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      </article>
    </div>
  );
}
