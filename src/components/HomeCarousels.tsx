"use client";

import Link from "next/link";
import { iconFromName } from "@/lib/icons";
import Carousel from "./Carousel";
import { getProductBadge, formatPrice, type Product } from "@/data/products";
import type { Department } from "@/data/departments";
import type { Article } from "@/data/news";

interface Props {
  type: "departments" | "products" | "news";
  /** Fetched on the server and passed down — this stays presentational. */
  products?: Product[];
  departments?: Department[];
  articles?: Article[];
}

const LINE = "1px solid rgba(32,30,29,.14)";
const PLATES = ["#c2c4ad", "#dfe3d0", "#e0dede", "#626b3f"];

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
      <Carousel options={{ align: "start", dragFree: true }} slideClassName="basis-[76%] pr-3">
        {products.slice(0, 4).map((product, i) => {
          const badge = getProductBadge(product);
          const BadgeIcon = badge.icon;
          const bs = BADGE_STYLE[badge.color] ?? BADGE_STYLE.gray;
          return (
            <Link
              key={product.id}
              href={`/merchandise/${product.slug}`}
              style={{
                display: "block",
                height: "100%",
                border: LINE,
                borderRadius: 2,
                overflow: "hidden",
                background: "#ffffff",
              }}
            >
              <span
                style={{
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                  aspectRatio: "4/3",
                  background: PLATES[i] ?? "#c2c4ad",
                  borderBottom: LINE,
                  overflow: "hidden",
                }}
              >
                {product.images.find((im) => im.url) ? (
                  // eslint-disable-next-line @next/next/no-img-element -- rasio asli bervariasi per produk.
                  <img
                    src={product.images.find((im) => im.url)!.url}
                    alt={product.name}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <>
                    <span
                      style={{
                        fontSize: 60,
                        fontWeight: 700,
                        color: "rgba(32,30,29,.14)",
                        letterSpacing: "-.04em",
                      }}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span
                      style={{
                        position: "absolute",
                        inset: 0,
                        backgroundImage:
                          "radial-gradient(circle,rgba(0,0,0,.22) 30%,transparent 32%)",
                        backgroundSize: "3px 3px",
                        mixBlendMode: "multiply",
                      }}
                    />
                  </>
                )}
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: "9.5px",
                    letterSpacing: ".12em",
                    textTransform: "uppercase",
                    background: bs.bg,
                    color: bs.fg,
                    padding: "4px 8px",
                    borderRadius: 2,
                  }}
                >
                  <BadgeIcon size={11} strokeWidth={2.25} />
                  {bs.short}
                </span>
              </span>
              <span style={{ display: "block", padding: "15px 16px 17px" }}>
                <span
                  style={{
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                    fontSize: 15.5,
                    fontWeight: 600,
                    lineHeight: 1.25,
                  }}
                >
                  {product.name}
                </span>
                <span
                  style={{
                    display: "block",
                    marginTop: 12,
                    borderTop: LINE,
                    paddingTop: 11,
                    fontSize: 18,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  {formatPrice(product.price)}
                </span>
              </span>
            </Link>
          );
        })}
      </Carousel>
    );
  }

  if (type === "news") {
    return (
      <Carousel options={{ align: "start", dragFree: true }} slideClassName="basis-[82%] pr-3">
        {articles.slice(0, 4).map((article) => (
          <Link
            key={article.id}
            href={`/berita/${article.slug}`}
            style={{
              display: "block",
              height: "100%",
              border: LINE,
              borderRadius: 2,
              background: "#ffffff",
              overflow: "hidden",
            }}
          >
            <span
              style={{
                position: "relative",
                display: "block",
                aspectRatio:
                  article.image_width && article.image_height
                    ? `${article.image_width}/${article.image_height}`
                    : "16/10",
                background: "#e0dede",
                overflow: "hidden",
                borderBottom: LINE,
              }}
            >
              {article.image ? (
                // eslint-disable-next-line @next/next/no-img-element -- rasio asli bervariasi per unggahan.
                <img
                  src={article.image}
                  alt={article.image_alt || article.title}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                  }}
                />
              ) : (
                <span
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 32,
                    fontWeight: 700,
                    color: "rgba(32,30,29,.14)",
                  }}
                >
                  TL
                </span>
              )}
              {article.is_pinned && (
                <span
                  style={{
                    position: "absolute",
                    left: 10,
                    top: 10,
                    fontSize: "9px",
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    background: "#7a8450",
                    color: "#ffffff",
                    padding: "4px 8px",
                    borderRadius: 2,
                  }}
                >
                  Disorot
                </span>
              )}
            </span>
            <span style={{ display: "block", padding: "16px 18px 20px" }}>
              <span style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span
                  style={{
                    fontSize: "9.5px",
                    letterSpacing: ".14em",
                    textTransform: "uppercase",
                    border: "1px solid rgba(32,30,29,.3)",
                    padding: "4px 8px",
                    borderRadius: 2,
                    color: "#201e1d",
                  }}
                >
                  {article.category}
                </span>
                <span
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: ".1em",
                    textTransform: "uppercase",
                    color: "#605d5d",
                  }}
                >
                  {new Date(article.published_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </span>
              <span
                style={{
                  display: "-webkit-box",
                  WebkitLineClamp: 3,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  fontSize: 17,
                  fontWeight: 600,
                  lineHeight: 1.3,
                  letterSpacing: "-.01em",
                }}
              >
                {article.title}
              </span>
            </span>
          </Link>
        ))}
      </Carousel>
    );
  }

  return null;
}
