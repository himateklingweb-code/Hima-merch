"use client";

/* eslint-disable @next/next/no-img-element */
import { useState } from "react";
import { SITE } from "@/lib/site";

/**
 * Isi lingkaran logo mitra.
 *
 * - Logo persegi / hampir persegi (rasio 0,8–1,25) memenuhi lingkaran penuh
 *   (`object-cover`), karena file logo biasanya sudah punya margin sendiri;
 *   kalau dikecilkan lagi, logo jadi tampak kecil di tengah lingkaran.
 * - Logo lebar / tinggi (mis. tulisan memanjang) di-`contain` 86% supaya
 *   tulisannya tidak terpotong tepi lingkaran.
 * - Mitra tanpa logo memakai logo HMTL samar.
 */
export default function PartnerLogoImg({ src, alt = "" }: { src?: string | null; alt?: string }) {
  const [wide, setWide] = useState(false);

  if (!src) {
    return <img src={SITE.logo} alt="" className="h-[70%] w-[70%] object-contain opacity-40" />;
  }

  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={(e) => {
        const { naturalWidth: w, naturalHeight: h } = e.currentTarget;
        if (w && h) {
          const r = w / h;
          setWide(r < 0.8 || r > 1.25);
        }
      }}
      className={wide ? "h-[86%] w-[86%] object-contain" : "h-full w-full object-cover"}
    />
  );
}
