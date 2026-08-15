"use client";

import Link from "next/link";
import Carousel from "./Carousel";
import { products, getProductBadge, formatPrice } from "@/data/products";
import { departments } from "@/data/departments";
import { articles } from "@/data/news";

interface Props {
  type: "departments" | "products" | "news";
}

const LINE = "1px solid rgba(32,30,29,.16)";
const PLATES = ["#d7d3d3", "#cbeeff", "#ffdee6", "#444141"];

const BADGE_STYLE: Record<string, { bg: string; fg: string; short: string }> = {
  green: { bg: "#0088b0", fg: "#f3f2f2", short: "Tersedia" },
  yellow: { bg: "#edbb00", fg: "#201e1d", short: "Pre-Order" },
  red: { bg: "#aa0b56", fg: "#f3f2f2", short: "Ditutup" },
  gray: { bg: "#7d7979", fg: "#f3f2f2", short: "Habis" },
};

export default function HomeCarousels({ type }: Props) {
  if (type === "departments") {
    return (
      <Carousel
        options={{ align: "start", dragFree: true }}
        slideClassName="basis-[72%] pr-3"
        showDots={false}
      >
        {departments.map((dept) => {
          const Icon = dept.icon;
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
                background: "#f3f2f2",
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
                    color: "#0088b0",
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
                  color: "#0088b0",
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
                background: "#f3f2f2",
              }}
            >
              <span
                style={{
                  position: "relative",
                  display: "grid",
                  placeItems: "center",
                  aspectRatio: "4/3",
                  background: PLATES[i] ?? "#d7d3d3",
                  borderBottom: LINE,
                  overflow: "hidden",
                }}
              >
                <span
                  style={{
                    fontSize: 60,
                    fontWeight: 700,
                    color: "rgba(32,30,29,.16)",
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
              background: "#f3f2f2",
              padding: "18px 18px 20px",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <span
                style={{
                  fontSize: "9.5px",
                  letterSpacing: ".14em",
                  textTransform: "uppercase",
                  border: "1px solid rgba(32,30,29,.35)",
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
          </Link>
        ))}
      </Carousel>
    );
  }

  return null;
}
