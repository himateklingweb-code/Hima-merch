/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { Metadata } from "next";
import { gdriveThumbnail } from "@/data/news";
import { getArticles } from "@/lib/content-repo";

export const metadata: Metadata = {
  title: "Berita",
  description:
    "Berita dan kabar terbaru dari HIMA Teknik Lingkungan Universitas Tanjungpura.",
};


// Read fresh at most once a minute so stock and new content appear
// without a redeploy.
export const revalidate = 60;

export default async function BeritaPage() {
  const articles = await getArticles();
  const sorted = [...articles].sort(
    (a, b) =>
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
  );

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
              letterSpacing: "-.03em",
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

        {/* Featured (first article) */}
        {sorted[0] && (
          <Link
            href={`/berita/${sorted[0].slug}`}
            className="beranda-product-card scroll-rise"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0,1.1fr) minmax(0,.9fr)",
              gap: 0,
              borderRadius: 2,
              overflow: "hidden",
              marginBottom: 32,
            }}
          >
            <div
              style={{
                aspectRatio: "16/10",
                background: "#e0dede",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {sorted[0].image && sorted[0].image !== "/placeholder-news.png" ? (
                <img
                  src={gdriveThumbnail(sorted[0].image)}
                  alt={sorted[0].image_alt}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 48,
                    color: "rgba(32,30,29,.14)",
                    fontWeight: 700,
                  }}
                >
                  TL
                </div>
              )}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage:
                    "radial-gradient(circle,rgba(0,0,0,.18) 30%,transparent 32%)",
                  backgroundSize: "3px 3px",
                  mixBlendMode: "multiply",
                }}
              />
            </div>
            <div style={{ padding: "clamp(20px,3vw,40px)", display: "grid", alignContent: "center", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span
                  style={{
                    fontSize: "9.5px",
                    letterSpacing: ".16em",
                    textTransform: "uppercase",
                    background: "#7a8450",
                    color: "#ffffff",
                    padding: "4px 10px",
                    borderRadius: 2,
                  }}
                >
                  {sorted[0].category}
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: ".1em",
                    color: "#605d5d",
                  }}
                >
                  {new Date(sorted[0].published_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "clamp(22px,2.6vw,32px)",
                  fontWeight: 700,
                  lineHeight: 1.18,
                  letterSpacing: "-.02em",
                }}
              >
                {sorted[0].title}
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  lineHeight: 1.55,
                  color: "#605d5d",
                }}
              >
                {sorted[0].excerpt}
              </p>
              <span
                style={{
                  fontSize: 11,
                  letterSpacing: ".16em",
                  textTransform: "uppercase",
                  color: "#201e1d",
                }}
              >
                Baca selengkapnya &rarr;
              </span>
            </div>
          </Link>
        )}

        {/* Grid for remaining */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
            gap: 24,
          }}
        >
          {sorted.slice(1).map((article, i) => (
            <Link
              key={article.id}
              href={`/berita/${article.slug}`}
              className="beranda-product-card scroll-rise"
              style={{
                display: "block",
                borderRadius: 2,
                overflow: "hidden",
                "--cover": `${32 + i * 3}%`,
              } as React.CSSProperties}
            >
              <div
                style={{
                  aspectRatio: "16/10",
                  background: "#e0dede",
                  position: "relative",
                  overflow: "hidden",
                  borderBottom: "1px solid rgba(32,30,29,.14)",
                }}
              >
                {article.image && article.image !== "/placeholder-news.png" ? (
                  <img
                    src={gdriveThumbnail(article.image)}
                    alt={article.image_alt}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 36,
                      color: "rgba(32,30,29,.14)",
                      fontWeight: 700,
                    }}
                  >
                    TL
                  </div>
                )}
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundImage:
                      "radial-gradient(circle,rgba(0,0,0,.18) 30%,transparent 32%)",
                    backgroundSize: "3px 3px",
                    mixBlendMode: "multiply",
                  }}
                />
              </div>
              <div style={{ padding: "20px 22px 24px" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    marginBottom: 10,
                  }}
                >
                  <span
                    style={{
                      fontSize: "9.5px",
                      letterSpacing: ".14em",
                      textTransform: "uppercase",
                      border: "1px solid rgba(32,30,29,.35)",
                      padding: "3px 8px",
                      borderRadius: 2,
                    }}
                  >
                    {article.category}
                  </span>
                  <span
                    style={{
                      fontSize: "10.5px",
                      color: "#605d5d",
                    }}
                  >
                    {new Date(article.published_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                </div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: 19,
                    fontWeight: 600,
                    lineHeight: 1.28,
                  }}
                >
                  {article.title}
                </h3>
                <p
                  style={{
                    margin: "10px 0 0",
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "#605d5d",
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  } as React.CSSProperties}
                >
                  {article.excerpt}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
