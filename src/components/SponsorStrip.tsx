"use client";

/* eslint-disable @next/next/no-img-element */
import Carousel from "./Carousel";
import type { Partner } from "@/data/partners";
import { SITE } from "@/lib/site";

/**
 * "Didukung oleh" — logo mitra & sponsor dipotong lingkaran seragam, apa pun
 * bentuk file aslinya (persegi, lebar, potret). Gambar di-`contain` di dalam
 * lingkaran putih supaya logo tidak terpotong. Mitra tanpa logo memakai logo
 * HMTL agar barisnya tetap rapi.
 *
 * Sampai 6 logo tampil sebagai baris statis; lebih dari itu berjalan sebagai
 * carousel otomatis yang tetap bisa digeser.
 */
function Badge({ partner }: { partner: Partner }) {
  const inner = (
    <>
      <span className="sponsor-circle">
        <img
          src={partner.logo || SITE.logo}
          alt=""
          loading="lazy"
          decoding="async"
        />
      </span>
      <span className="sponsor-name">{partner.name}</span>
    </>
  );

  return partner.website ? (
    <a
      href={partner.website}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="sponsor-logo"
      title={partner.name}
    >
      {inner}
    </a>
  ) : (
    <div className="sponsor-logo" title={partner.name}>
      {inner}
    </div>
  );
}

export default function SponsorStrip({ items }: { items: Partner[] }) {
  if (items.length === 0) return null;

  if (items.length <= 6) {
    return (
      <div className="sponsor-row">
        {items.map((p) => (
          <Badge key={p.id} partner={p} />
        ))}
      </div>
    );
  }

  return (
    <Carousel
      options={{ align: "start", loop: true, dragFree: true }}
      slideClassName="basis-1/3 sm:basis-1/5 lg:basis-[12.5%]"
      autoplay={2800}
      showDots={false}
    >
      {items.map((p) => (
        <Badge key={p.id} partner={p} />
      ))}
    </Carousel>
  );
}
