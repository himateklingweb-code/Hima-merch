"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { gdriveThumbnail } from "@/data/news";
import { matchesQuery } from "@/lib/search";

/** Data kartu berita, tanggal sudah diformat di server (zona waktu WIB). */
export interface ArticleCard {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  image: string;
  image_alt: string;
  dateLong: string;
  dateShort: string;
  year: string;
}

export default function ArticleBrowser({ articles }: { articles: ArticleCard[] }) {
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");

  const categories = useMemo(
    () => [...new Set(articles.map((a) => a.category).filter(Boolean))].sort(),
    [articles]
  );

  const shown = useMemo(
    () =>
      articles.filter(
        (a) =>
          (!category || a.category === category) &&
          matchesQuery(q, a.title, a.excerpt, a.category, a.year)
      ),
    [articles, q, category]
  );

  const filtered = q.trim() !== "" || category !== "";
  const [first, ...rest] = shown;

  return (
    <>
      {articles.length > 3 && (
        <div
          style={{ marginBottom: 28 }}
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <label className="relative flex-1 sm:max-w-sm">
            <span className="sr-only">Cari berita</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#605d5d]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari judul, kegiatan, tahun…"
              className="h-11 w-full rounded-sm border border-[rgba(32,30,29,.2)] bg-white pl-9 pr-9 text-sm outline-none focus:border-[#7a8450] focus:ring-2 focus:ring-[#7a8450]/25"
            />
            {q && (
              <button
                type="button"
                onClick={() => setQ("")}
                aria-label="Hapus pencarian"
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-sm text-[#605d5d] hover:bg-black/5"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </label>
          {categories.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 -mx-4 px-4 sm:mx-0 sm:px-0">
              {["", ...categories].map((c) => (
                <button
                  key={c || "all"}
                  type="button"
                  onClick={() => setCategory(c)}
                  aria-pressed={category === c}
                  className={`h-9 shrink-0 rounded-sm border px-3.5 text-[11px] uppercase tracking-[.12em] transition-colors ${
                    category === c
                      ? "border-[#7a8450] bg-[#7a8450] text-white"
                      : "border-[rgba(32,30,29,.25)] bg-white text-[#201e1d] hover:border-[#201e1d]"
                  }`}
                >
                  {c || "Semua"}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {filtered && (
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "#605d5d" }} aria-live="polite">
          {shown.length} dari {articles.length} berita
        </p>
      )}

      {articles.length === 0 && (
        <p style={{ margin: 0, fontSize: 15, color: "#605d5d" }}>
          Belum ada berita yang diterbitkan.
        </p>
      )}

      {filtered && shown.length === 0 && (
        <div
          style={{
            border: "1px dashed rgba(32,30,29,.3)",
            padding: "56px 24px",
            textAlign: "center",
          }}
        >
          <p style={{ margin: 0, fontSize: 15, color: "#201e1d" }}>
            Tidak ada berita yang cocok.
          </p>
          <button
            type="button"
            onClick={() => {
              setQ("");
              setCategory("");
            }}
            style={{ marginTop: 12, fontSize: 14, color: "#4f5634", textDecoration: "underline" }}
          >
            Tampilkan semua berita
          </button>
        </div>
      )}

      {/* Featured (first article) */}
      {first && (
        <Link
          href={`/berita/${first.slug}`}
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
            {first.image && first.image !== "/placeholder-news.png" ? (
              <img
                src={gdriveThumbnail(first.image)}
                alt={first.image_alt}
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
                {first.category}
              </span>
              <span
                style={{
                  fontSize: "10.5px",
                  letterSpacing: ".1em",
                  color: "#605d5d",
                }}
              >
                {first.dateLong}
              </span>
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: "clamp(22px,2.6vw,32px)",
                fontWeight: 700,
                lineHeight: 1.18,
                letterSpacing: "-.01em",
              }}
            >
              {first.title}
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                lineHeight: 1.55,
                color: "#605d5d",
              }}
            >
              {first.excerpt}
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
        {rest.map((article, i) => (
          <Link
            key={article.id}
            href={`/berita/${article.slug}`}
            className="beranda-product-card scroll-rise"
            style={{
              display: "block",
              borderRadius: 2,
              overflow: "hidden",
              "--cover": `${32 + i * 3}%`,
            } as CSSProperties}
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
                  {article.dateShort}
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
                } as CSSProperties}
              >
                {article.excerpt}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
