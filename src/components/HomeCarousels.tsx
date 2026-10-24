"use client";

import Link from "next/link";
import { iconFromName } from "@/lib/icons";
import Carousel from "./Carousel";
import { getProductBadge, formatPrice, type Product } from "@/data/products";
import type { Department } from "@/data/departments";
import type { Article } from "@/data/news";
import { SITE, imageRatio } from "@/lib/site";

interface Props {
  type: "departments" | "products" | "news";
  /** Fetched on the server and passed down — this stays presentational. */
  products?: Product[];
  departments?: Department[];
  articles?: Article[];
}

const LINE = "1px solid rgba(32,30,29,.14)";

const BADGE_STYLE: Record<string, { bg: string; fg: string; short: string }> = {
  green: { bg: "#7a8450", fg: "#ffffff", short: "Tersedia" },
  yellow: { bg: "#ffd985", fg: "#201e1d", short: "Pre-Order" },
  red: { bg: "#626b3f", fg: "#ffffff", short: "Ditutup" },
  gray: { bg: "#605d5d", fg: "#ffffff", short: "Habis" },
};

export default function HomeCarousels({
  type,
  products = [],
  departments = [],
  articles = [],
}: Props) {
  if (type === "departments") {
    return (
      <Carousel
        options={{ align: "start", dragFree: true }}
        slideClassName="basis-[72%] pr-3"
        showDots={false}
      >
        {departments.map((dept) => {
          const Icon = iconFromName(dept.icon);
          const activeCount = dept.periods.find((p) => p.is_active)?.members.length ?? 0;
          return (
            <Link
              key={dept.id}
              href={`/departemen/${dept.slug}`}
              style={{
                display: "block",
                height: "100%",
                border: LINE,
                borderRadius: 2,
                background: "#ffffff",
                padding: 18,
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 10 }}>
                <span
                  style={{
                    width: 38,
                    height: 38,
                    flexShrink: 0,
                    border: LINE,
                    borderRadius: 2,
                    background: "#fff",
                    color: "#7a8450",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  <Icon size={19} strokeWidth={1.75} />
                </span>
                <span style={{ fontSize: 15, fontWeight: 600, lineHeight: 1.15, letterSpacing: "-.01em" }}>
                  {dept.name}
                </span>
              </span>
              <span
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  color: "#605d5d",
                }}
              >
                {dept.description}
              </span>
              <span
                style={{
                  display: "block",
                  marginTop: 12,
                  fontSize: "10px",
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  color: "#7a8450",
                }}
              >
                {activeCount} pengurus aktif
              </span>
            </Link>
          );
        })}
      </Carousel>
    );
  }

  if (type === "products") {
    return (
      <Carousel
        options={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
        slideClassName="home-slide-product"
        showArrows
        showDots={false}
      >
        {products.slice(0, 10).map((product) => {
          const badge = getProductBadge(product);
          const bs = BADGE_STYLE[badge.color] ?? BADGE_STYLE.gray;
          const cover = product.images.find((im) => im.url)?.url;
          return (
            <Link
              key={product.id}
              href={`/merchandise/${product.slug}`}
              className="home-card home-product-card"
            >
              <span className="home-product-media">
                {cover ? (
                  // eslint-disable-next-line @next/next/no-img-element -- gambar Supabase, rasio bebas.
                  <img src={cover} alt={product.name} loading="lazy" decoding="async" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element -- logo situs sebagai pengganti foto.
                  <img src={SITE.logo} alt="" className="home-media-fallback" />
                )}
                <span className="home-badge" style={{ background: bs.bg, color: bs.fg }}>
                  {bs.short}
                </span>
              </span>
              <span className="home-card-body">
                <span className="home-card-title">{product.name}</span>
                <span className="home-product-price">{formatPrice(product.price)}</span>
              </span>
            </Link>
          );
        })}
      </Carousel>
    );
  }

  if (type === "news") {
    return (
      <Carousel
        options={{ align: "start", dragFree: true, containScroll: "trimSnaps" }}
        slideClassName="home-slide-news"
        showArrows
        showDots={false}
      >
        {articles.map((article) => (
          <Link key={article.id} href={`/berita/${article.slug}`} className="home-card">
            <span
              className="home-news-media"
              style={{
                aspectRatio: imageRatio(article.image_width, article.image_height, "16/10", 1.2, 1.9),
              }}
            >
              {article.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- rasio asli bervariasi per unggahan.
                <img src={article.image} alt={article.image_alt || article.title} loading="lazy" decoding="async" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element -- logo situs sebagai pengganti foto.
                <img src={SITE.logo} alt="" className="home-media-fallback" />
              )}
              {article.is_pinned && (
                <span className="home-badge" style={{ background: "#7a8450", color: "#fff" }}>
                  Disorot
                </span>
              )}
            </span>
            <span className="home-card-body">
              <span className="home-news-meta">
                <span className="home-news-cat">{article.category}</span>
                <span>
                  {new Date(article.published_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </span>
              <span className="home-card-title home-card-title-3">{article.title}</span>
            </span>
          </Link>
        ))}
      </Carousel>
    );
  }

  return null;
}
