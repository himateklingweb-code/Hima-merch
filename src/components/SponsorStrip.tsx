"use client";

/* eslint-disable @next/next/no-img-element */
import Carousel from "./Carousel";
import { partners } from "@/data/partners";
import { gdriveThumbnail } from "@/data/news";

/**
 * The logo wall that closes the homepage — a slow, self-advancing strip
 * of every mitra and sponsor. Partners without artwork fall back to a
 * wordmark so they can be listed before a logo file exists.
 */
export default function SponsorStrip() {
  if (partners.length === 0) return null;

  return (
    <Carousel
      options={{ align: "start", loop: true, dragFree: true }}
      slideClassName="basis-1/2 sm:basis-1/3 lg:basis-1/5"
      autoplay={2800}
      showDots={false}
    >
      {partners.map((partner) => {
        const inner = partner.logo ? (
          <img src={gdriveThumbnail(partner.logo, 320)} alt={partner.name} />
        ) : (
          <span
            style={{
              textAlign: "center",
              fontSize: "11.5px",
              fontWeight: 600,
              letterSpacing: ".04em",
              lineHeight: 1.35,
              color: "#605d5d",
            }}
          >
            {partner.name}
          </span>
        );

        return partner.website ? (
          <a
            key={partner.id}
            href={partner.website}
            target="_blank"
            rel="noopener noreferrer sponsored"
            className="sponsor-logo"
            title={partner.name}
          >
            {inner}
          </a>
        ) : (
          <div key={partner.id} className="sponsor-logo" title={partner.name}>
            {inner}
          </div>
        );
      })}
    </Carousel>
  );
}
