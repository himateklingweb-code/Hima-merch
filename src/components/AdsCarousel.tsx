"use client";

/* eslint-disable @next/next/no-img-element */
import Carousel from "./Carousel";
import { getActiveAds } from "@/data/ads";
import { gdriveThumbnail } from "@/data/news";

/**
 * Self-advancing carousel of mitra ad cards. Content comes from
 * /admin/iklan — each card carries the sponsor's logo and links out to
 * the website they nominated.
 */
export default function AdsCarousel() {
  const items = getActiveAds();
  if (items.length === 0) return null;

  return (
    <Carousel
      options={{ align: "start", loop: true }}
      slideClassName="basis-[86%] sm:basis-[52%] lg:basis-[33.333%] pr-4"
      autoplay={4200}
      showDots
    >
      {items.map((ad) => (
        <a
          key={ad.id}
          href={ad.website}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="ad-card"
        >
          <span className="ad-card-logo">
            {ad.logo ? (
              <img src={gdriveThumbnail(ad.logo, 480)} alt={ad.name} />
            ) : (
              <span
                style={{
                  padding: "0 22px",
                  textAlign: "center",
                  fontSize: 21,
                  fontWeight: 700,
                  letterSpacing: "-.02em",
                  lineHeight: 1.2,
                  color: "rgba(32,30,29,.28)",
                }}
              >
                {ad.name}
              </span>
            )}
          </span>
          <span
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              flex: 1,
              padding: "18px 20px 20px",
            }}
          >
            <span
              style={{
                fontSize: "9.5px",
                letterSpacing: ".18em",
                textTransform: "uppercase",
                color: "#7a8450",
              }}
            >
              Mitra
            </span>
            <span
              style={{
                fontSize: 18,
                fontWeight: 600,
                lineHeight: 1.25,
                letterSpacing: "-.01em",
              }}
            >
              {ad.name}
            </span>
            <span
              style={{
                fontSize: "13.5px",
                lineHeight: 1.55,
                color: "#605d5d",
              }}
            >
              {ad.blurb}
            </span>
            <span
              style={{
                marginTop: "auto",
                paddingTop: 14,
                borderTop: "1px solid rgba(32,30,29,.14)",
                fontSize: "10.5px",
                letterSpacing: ".16em",
                textTransform: "uppercase",
                color: "#201e1d",
              }}
            >
              Kunjungi situs &rarr;
            </span>
          </span>
        </a>
      ))}
    </Carousel>
  );
}
