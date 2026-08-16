/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { articles } from "@/data/news";
import { departments } from "@/data/departments";
import { products, formatPrice } from "@/data/products";
import { getHomeStats } from "@/data/site";
import StatsCounter from "@/components/StatsCounter";
import HomeCarousels from "@/components/HomeCarousels";
import AdsCarousel from "@/components/AdsCarousel";
import SponsorStrip from "@/components/SponsorStrip";

function badgeOf(p: (typeof products)[0], now: number) {
  if (p.stock_type === "ready_stock") {
    const left = p.stock - p.stock_reserved;
    return left > 0
      ? { label: "Tersedia", bg: "#7a8450", fg: "#ffffff", state: "ready" }
      : { label: "Stok habis", bg: "#605d5d", fg: "#ffffff", state: "habis" };
  }
  const taken = (p.po_filled ?? 0) + (p.po_reserved ?? 0);
  const open =
    p.po_deadline &&
    new Date(p.po_deadline).getTime() > now &&
    taken < (p.po_quota ?? 0);
  return open
    ? { label: "Pre-order dibuka", bg: "#ffd985", fg: "#201e1d", state: "po" }
    : {
        label: "Pre-order ditutup",
        bg: "#626b3f",
        fg: "#ffffff",
        state: "po-tutup",
      };
}

const PLATES = ["#c2c4ad", "#626b3f", "#dfe3d0", "#e0dede", "#eceaea"];

export default function HomePage() {
  const now = Date.now();
  const stats = getHomeStats();

  const poOpen = products.filter((p) => {
    if (p.stock_type !== "pre_order" || !p.po_deadline) return false;
    const taken = (p.po_filled ?? 0) + (p.po_reserved ?? 0);
    return new Date(p.po_deadline).getTime() > now && taken < (p.po_quota ?? 0);
  });
  const poPrimary =
    poOpen[0] || products.find((p) => p.stock_type === "pre_order");
  const poSisa = poPrimary
    ? Math.max(
        0,
        (poPrimary.po_quota ?? 0) -
          ((poPrimary.po_filled ?? 0) + (poPrimary.po_reserved ?? 0))
      )
    : 0;

  const featured = products.slice(0, 3).map((p, i) => {
    const badge = badgeOf(p, now);
    const taken = (p.po_filled ?? 0) + (p.po_reserved ?? 0);
    const left = p.stock - p.stock_reserved;
    const meta =
      p.stock_type === "ready_stock"
        ? left > 0
          ? `${left} siap kirim`
          : "Menunggu batch"
        : badge.state === "po"
          ? `${taken}/${p.po_quota} terisi`
          : "Tenggat lewat";
    const metaColor =
      badge.state === "ready"
        ? "#7a8450"
        : badge.state === "po"
          ? "#201e1d"
          : "#605d5d";
    return {
      slug: p.slug,
      no: String(i + 1).padStart(2, "0"),
      name: p.name,
      plate: PLATES[i] || "#c2c4ad",
      price: formatPrice(p.price),
      badge,
      meta,
      metaColor,
    };
  });

  const latest = [...articles]
    .sort(
      (a, b) =>
        new Date(b.published_at).getTime() -
        new Date(a.published_at).getTime()
    )
    .slice(0, 2)
    .map((a) => ({
      slug: a.slug,
      title: a.title,
      excerpt: a.excerpt,
      category: a.category,
      date: new Date(a.published_at).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    }));

  const tickerItems: string[] = [];
  products.forEach((p) => {
    if (p.stock_type !== "pre_order") return;
    const taken = (p.po_filled ?? 0) + (p.po_reserved ?? 0);
    const total = p.po_quota ?? 0;
    if (
      p.po_deadline &&
      new Date(p.po_deadline).getTime() > now &&
      taken < total
    ) {
      tickerItems.push(`Pre-order ${p.name} · kuota ${taken}/${total}`);
    } else {
      tickerItems.push(`${p.name} — ${taken}/${total} terpenuhi`);
    }
  });
  articles.slice(0, 3).forEach((a) => tickerItems.push(a.title));

  return (
    <div style={{ position: "relative", background: "#ffffff", minHeight: "100vh" }}>
      {/* ═══ HERO ═══ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(32,30,29,.14)",
        }}
      >
        {/* On mobile the hero photo becomes the section's background —
            the framed column below is hidden at that width. */}
        <div className="hero-photo-bg" aria-hidden="true">
          <img src="/assets/plate.jpg" alt="" />
        </div>

        {/* No halftone texture over the hero: a dot screen across the whole
            section muddies the white ground into khaki. The dot pattern is
            kept only where it belongs — over photos and colour plates, as a
            multiply overlay. */}

        {/* Blobs — white highlights, not tints: they add depth by
            lightening the ground rather than casting a colour over it. */}
        <div
          style={{
            position: "absolute",
            top: -140,
            left: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: 0.55,
            filter: "blur(10px)",
            animation: "drift calc(26s * var(--mo,1)) ease-in-out infinite",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -180,
            right: -100,
            width: 460,
            height: 460,
            borderRadius: "50%",
            background: "#ffffff",
            opacity: 0.45,
            filter: "blur(10px)",
            animation:
              "drift calc(31s * var(--mo,1)) ease-in-out infinite reverse",
          }}
        />

        {/* Meta bar */}
        <div
          className="hero-meta"
          style={{
            position: "relative",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "20px clamp(16px,3vw,40px) 0",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              fontSize: "10.5px",
              letterSpacing: ".2em",
              textTransform: "uppercase" as const,
              color: "#605d5d",
              borderBottom: "1px solid rgba(32,30,29,.14)",
              paddingBottom: 12,
              animation: "reveal .7s ease-out both",
              flexWrap: "wrap" as const,
            }}
          >
            <span
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                color: "#201e1d",
              }}
            >
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "#626b3f",
                  animation:
                    "blink calc(1.6s * var(--mo,1)) steps(1,end) infinite",
                }}
              />
              Pre-order dibuka
            </span>
            <span
              className="hero-divider scroll-hairline"
              style={{
                flex: 1,
                minWidth: 20,
                height: 1,
                background: "rgba(32,30,29,.14)",
              }}
            />
            <span>hima.tekniklingkungan.com</span>
            <span style={{ color: "rgba(32,30,29,.3)" }}>/</span>
            <span>Edisi 2025 / 2026</span>
            <span style={{ color: "rgba(32,30,29,.3)" }}>/</span>
            <span>Pontianak, Kalimantan Barat</span>
          </div>
        </div>

        {/* Hero grid */}
        <div
          className="hero-grid"
          style={{
            position: "relative",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "48px clamp(16px,3vw,40px) 0",
            display: "grid",
            gridTemplateColumns: "minmax(0,1.32fr) minmax(0,.85fr)",
            gap: "clamp(28px,4vw,56px)",
            alignItems: "start",
          }}
        >
          {/* Left — text */}
          <div>
            <p
              style={{
                margin: "0 0 22px",
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                color: "#7a8450",
                animation: "reveal .8s ease-out both",
              }}
            >
              Himpunan Mahasiswa &middot; Fakultas Teknik
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(48px,8vw,124px)",
                lineHeight: 0.86,
                fontWeight: 700,
                letterSpacing: "-.035em",
              }}
            >
              <span
                style={{
                  display: "block",
                  animation:
                    "clipUp 1s cubic-bezier(.2,.8,.2,1) both",
                  animationDelay: "80ms",
                }}
              >
                TEKNIK
              </span>
              <span
                style={{
                  display: "block",
                  color: "transparent",
                  WebkitTextStroke: "1.5px #201e1d",
                  animation:
                    "clipUp 1s cubic-bezier(.2,.8,.2,1) both",
                  animationDelay: "220ms",
                } as React.CSSProperties}
              >
                LINGKUNGAN
              </span>
              <span
                style={{
                  display: "block",
                  animation:
                    "clipUp 1s cubic-bezier(.2,.8,.2,1) both",
                  animationDelay: "360ms",
                }}
              >
                UNTAN<span style={{ color: "#626b3f" }}>.</span>
              </span>
            </h1>
            <div
              className="hero-desc"
              style={{
                margin: "30px 0 0",
                display: "grid",
                gridTemplateColumns: "110px 1fr",
                gap: 26,
                alignItems: "start",
                animation: "reveal 1s ease-out both",
                animationDelay: "520ms",
              }}
            >
              <div
                style={{
                  borderTop: "2px solid #201e1d",
                  paddingTop: 10,
                  fontSize: "10.5px",
                  letterSpacing: ".16em",
                  textTransform: "uppercase" as const,
                  color: "#605d5d",
                }}
              >
                Situs
                <br />
                resmi
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 19,
                  lineHeight: 1.52,
                  maxWidth: "52ch",
                }}
              >
                Wadah resmi mahasiswa Program Studi Teknik Lingkungan
                Universitas Tanjungpura — enam departemen, satu periode
                aktif, dan kerja lapangan yang benar-benar menyentuh
                air, udara, dan tanah Kalimantan Barat.
              </p>
            </div>
            <div
              style={{
                marginTop: 38,
                display: "flex",
                gap: 12,
                alignItems: "center",
                flexWrap: "wrap" as const,
                animation: "reveal 1s ease-out both",
                animationDelay: "640ms",
              }}
            >
              <Link
                href="/merchandise"
                className="beranda-hero-cta btn-sheen"
                style={{
                  padding: "15px 28px",
                  borderRadius: 2,
                  fontSize: 13,
                  letterSpacing: ".09em",
                  textTransform: "uppercase" as const,
                  display: "inline-block",
                }}
              >
                Lihat Merchandise
              </Link>
              <Link
                href="/departemen"
                className="beranda-hero-outline"
                style={{
                  padding: "14px 26px",
                  borderRadius: 2,
                  fontSize: 13,
                  letterSpacing: ".09em",
                  textTransform: "uppercase" as const,
                  display: "inline-block",
                }}
              >
                Kenali Pengurus
              </Link>
            </div>
          </div>

          {/* Right — image (desktop only; mobile uses the section bg) */}
          <div className="hero-figure" style={{ position: "relative" }}>
            <figure
              style={{
                position: "relative",
                margin: 0,
                aspectRatio: "4/5",
                overflow: "hidden",
                background: "#e0dede",
                border: "1px solid rgba(32,30,29,.14)",
                animation:
                  "revealScale 1.1s cubic-bezier(.2,.8,.2,1) both",
                animationDelay: "300ms",
              }}
            >
              <img
                src="/assets/plate.jpg"
                alt="Kegiatan lapangan mahasiswa Teknik Lingkungan"
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter: "grayscale(1) contrast(1.12) brightness(1.04)",
                }}
              />
              {/* Soft olive duotone — calm and formal, no chromatic glitch */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(150deg, rgba(122,132,80,.44), rgba(98,107,63,.34))",
                  mixBlendMode: "multiply",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  pointerEvents: "none",
                  backgroundImage:
                    "radial-gradient(circle,rgba(0,0,0,.22) 30%,transparent 32%)",
                  backgroundSize: "3px 3px",
                  mixBlendMode: "multiply",
                }}
              />
              <figcaption
                style={{
                  position: "absolute",
                  left: 0,
                  bottom: 0,
                  right: 0,
                  padding: "10px 12px",
                  background: "rgba(255,255,255,.92)",
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase" as const,
                  color: "#605d5d",
                  borderTop: "1px solid rgba(32,30,29,.14)",
                }}
              >
                Dokumentasi kegiatan lapangan
              </figcaption>
            </figure>
            {/* Floating PO badge */}
            <Link
              href="/merchandise"
              className="po-badge"
              style={{
                position: "absolute",
                left: -42,
                bottom: 64,
                width: 132,
                height: 132,
                display: "grid",
                placeItems: "center",
                color: "#201e1d",
                animation:
                  "floatY calc(7s * var(--mo,1)) ease-in-out infinite",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  border: "1.5px dashed #201e1d",
                  borderRadius: "50%",
                  animation:
                    "spinSlow calc(24s * var(--mo,1)) linear infinite",
                }}
              />
              <span
                style={{
                  textAlign: "center",
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase" as const,
                  lineHeight: 1.5,
                  background: "#ffd985",
                  borderRadius: "50%",
                  width: 104,
                  height: 104,
                  display: "grid",
                  placeContent: "center",
                  border: "1px solid #201e1d",
                }}
              >
                <span
                  style={{
                    fontSize: 22,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    fontFeatureSettings: "'tnum'",
                  }}
                >
                  {poSisa}
                </span>
                <span>
                  slot PO
                  <br />
                  tersisa
                </span>
              </span>
            </Link>
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="hero-cue"
          style={{
            position: "relative",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "32px 40px 26px",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column" as const,
              alignItems: "center",
              gap: 6,
              fontSize: 10,
              letterSpacing: ".24em",
              textTransform: "uppercase" as const,
              color: "#605d5d",
            }}
          >
            Gulir
            <span
              style={{
                width: 1,
                height: 34,
                background: "rgba(32,30,29,.3)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#626b3f",
                  animation:
                    "cue calc(1.9s * var(--mo,1)) ease-in-out infinite",
                }}
              />
            </span>
          </div>
        </div>

        {/* Marquee */}
        <div
          style={{
            position: "relative",
            background: "#201e1d",
            color: "#ffffff",
            overflow: "hidden",
            padding: "13px 0",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "max-content",
              animation:
                "marquee calc(34s * var(--mo,1)) linear infinite",
              fontSize: "12.5px",
              letterSpacing: ".14em",
              textTransform: "uppercase" as const,
            }}
          >
            {[0, 1].map((copy) => (
              <span
                key={copy}
                style={{ display: "flex", gap: 44, paddingRight: 44 }}
                aria-hidden={copy === 1 || undefined}
              >
                {tickerItems.flatMap((item, i) => [
                  <span key={`t${i}`}>{item}</span>,
                  <span key={`d${i}`} style={{ color: "#ffd985" }}>
                    &#9670;
                  </span>,
                ])}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ STATS ═══ */}
      <section
        style={{
          borderBottom: "1px solid rgba(32,30,29,.14)",
          background: "#f4f4f4",
        }}
      >
        <StatsCounter targets={stats} />
      </section>

      {/* ═══ NEWS ═══ */}
      <section style={{ borderBottom: "1px solid rgba(32,30,29,.14)" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "88px clamp(16px,3vw,40px)",
          }}
        >
          <div
            className="scroll-reveal-x"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              flexWrap: "wrap" as const,
              marginBottom: 12,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                color: "#7a8450",
                flex: "none",
              }}
            >
              Berita terbaru
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(32,30,29,.14)",
              }}
            />
            <Link
              href="/berita"
              className="link-underline"
              style={{
                fontSize: 11,
                letterSpacing: ".16em",
                textTransform: "uppercase" as const,
                flex: "none",
                marginLeft: "auto",
                color: "#201e1d",
              }}
            >
              Semua berita &rarr;
            </Link>
          </div>
          <div className="home-desktop-cards">
          {latest.map((a) => (
            <Link
              key={a.slug}
              href={`/berita/${a.slug}`}
              className="beranda-news-row scroll-reveal-x"
              style={{
                display: "grid",
                gridTemplateColumns: "120px minmax(0,1fr) 150px",
                gap: 28,
                alignItems: "center",
                padding: "26px 0",
              }}
            >
              <span
                className="news-row-grid"
                style={{
                  fontSize: "10.5px",
                  letterSpacing: ".16em",
                  textTransform: "uppercase" as const,
                  color: "#605d5d",
                }}
              >
                {a.date}
              </span>
              <span style={{ display: "grid", gap: 7 }}>
                <span
                  style={{
                    fontSize: 23,
                    fontWeight: 600,
                    lineHeight: 1.24,
                    letterSpacing: "-.015em",
                  }}
                >
                  {a.title}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    lineHeight: 1.55,
                    color: "#605d5d",
                    maxWidth: "72ch",
                  }}
                >
                  {a.excerpt}
                </span>
              </span>
              <span
                className="news-row-cat"
                style={{
                  fontSize: "10.5px",
                  letterSpacing: ".14em",
                  textTransform: "uppercase" as const,
                  justifySelf: "end",
                  border: "1px solid rgba(32,30,29,.3)",
                  padding: "5px 11px",
                  borderRadius: 2,
                }}
              >
                {a.category}
              </span>
            </Link>
          ))}
          </div>
          <div className="home-mobile-carousel">
            <HomeCarousels type="news" />
          </div>
        </div>
      </section>

      {/* ═══ PROFIL HIMA ═══ */}
      <section
        style={{
          borderBottom: "1px solid rgba(32,30,29,.14)",
          background: "#f4f4f4",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "88px clamp(16px,3vw,40px)",
          }}
        >
          <div
            className="scroll-reveal-x"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              flexWrap: "wrap" as const,
              marginBottom: 40,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                color: "#7a8450",
                flex: "none",
              }}
            >
              Tentang kami
            </span>
            <span
              style={{ flex: 1, height: 1, background: "rgba(32,30,29,.14)" }}
            />
            <Link
              href="/tentang"
              className="link-underline"
              style={{
                fontSize: 11,
                letterSpacing: ".16em",
                textTransform: "uppercase" as const,
                flex: "none",
                marginLeft: "auto",
                color: "#201e1d",
              }}
            >
              Profil lengkap &rarr;
            </Link>
          </div>

          <div className="profil-grid">
            <div>
              <h2
                className="scroll-reveal"
                style={{
                  margin: 0,
                  fontSize: "clamp(30px,4vw,52px)",
                  lineHeight: 1.04,
                  fontWeight: 700,
                  letterSpacing: "-.03em",
                }}
              >
                Wadah mahasiswa
                <br />
                <span
                  style={{
                    color: "transparent",
                    WebkitTextStroke: "1.2px #201e1d",
                  } as React.CSSProperties}
                >
                  Teknik Lingkungan
                </span>
              </h2>
              <p
                className="scroll-reveal"
                style={{
                  margin: "24px 0 0",
                  fontSize: 17,
                  lineHeight: 1.6,
                  color: "#605d5d",
                  maxWidth: "52ch",
                }}
              >
                HIMA TL UNTAN menaungi aspirasi, pengembangan diri, dan
                kontribusi nyata mahasiswa Teknik Lingkungan bagi masyarakat
                Kalimantan Barat — lewat kajian, aksi lapangan, dan kolaborasi
                lintas lembaga.
              </p>
            </div>

            <div style={{ display: "grid", gap: 16 }}>
              {[
                {
                  k: "Visi",
                  v: "Organisasi progresif dan inovatif yang berdedikasi mengembangkan potensi mahasiswa serta berkontribusi nyata bagi lingkungan.",
                },
                {
                  k: "Fokus kerja",
                  v: "Kajian keilmuan, aksi lingkungan, kaderisasi, kewirausahaan, dan hubungan eksternal.",
                },
                {
                  k: "Wilayah",
                  v: "Fakultas Teknik, Universitas Tanjungpura — Pontianak, Kalimantan Barat.",
                },
              ].map((row, i) => (
                <div
                  key={row.k}
                  className="scroll-rise"
                  style={{
                    background: "#ffffff",
                    border: "1px solid rgba(32,30,29,.14)",
                    borderRadius: 2,
                    padding: "20px 22px",
                    "--cover": `${30 + i * 3}%`,
                  } as React.CSSProperties}
                >
                  <div
                    style={{
                      fontSize: "10.5px",
                      letterSpacing: ".2em",
                      textTransform: "uppercase" as const,
                      color: "#7a8450",
                      marginBottom: 8,
                    }}
                  >
                    {row.k}
                  </div>
                  <div
                    style={{ fontSize: "14.5px", lineHeight: 1.6, color: "#201e1d" }}
                  >
                    {row.v}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ DEPARTEMEN ═══ */}
      <section style={{ borderBottom: "1px solid rgba(32,30,29,.14)" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "88px clamp(16px,3vw,40px)",
          }}
        >
          <div
            className="scroll-reveal-x"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              flexWrap: "wrap" as const,
              marginBottom: 40,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                color: "#7a8450",
                flex: "none",
              }}
            >
              Struktur kepengurusan
            </span>
            <span
              style={{ flex: 1, height: 1, background: "rgba(32,30,29,.14)" }}
            />
            <Link
              href="/departemen"
              className="link-underline"
              style={{
                fontSize: 11,
                letterSpacing: ".16em",
                textTransform: "uppercase" as const,
                flex: "none",
                marginLeft: "auto",
                color: "#201e1d",
              }}
            >
              Semua departemen &rarr;
            </Link>
          </div>

          <div
            className="home-desktop-cards"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 20,
            }}
          >
            {departments.map((dept, i) => {
              const Icon = dept.icon;
              const activeCount =
                dept.periods.find((p) => p.is_active)?.members.length ?? 0;
              return (
                <Link
                  key={dept.id}
                  href={`/departemen/${dept.slug}`}
                  className="beranda-quick-card scroll-rise"
                  style={{
                    display: "grid",
                    gap: 12,
                    padding: "26px 24px",
                    borderRadius: 2,
                    alignContent: "start",
                    "--cover": `${28 + i * 2}%`,
                  } as React.CSSProperties}
                >
                  <span
                    style={{
                      width: 40,
                      height: 40,
                      border: "1px solid rgba(32,30,29,.14)",
                      borderRadius: 2,
                      display: "grid",
                      placeItems: "center",
                      color: "#7a8450",
                    }}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      fontWeight: 700,
                      letterSpacing: "-.02em",
                      lineHeight: 1.15,
                    }}
                  >
                    {dept.name}
                  </span>
                  <span
                    style={{
                      fontSize: "13.5px",
                      lineHeight: 1.55,
                      color: "#605d5d",
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    } as React.CSSProperties}
                  >
                    {dept.description}
                  </span>
                  <span
                    style={{
                      marginTop: 4,
                      fontSize: "10px",
                      letterSpacing: ".14em",
                      textTransform: "uppercase" as const,
                      color: "#7a8450",
                    }}
                  >
                    {activeCount} pengurus aktif
                  </span>
                </Link>
              );
            })}
          </div>
          <div className="home-mobile-carousel">
            <HomeCarousels type="departments" />
          </div>
        </div>
      </section>

      {/* ═══ MITRA ADS ═══ */}
      <section
        style={{
          borderBottom: "1px solid rgba(32,30,29,.14)",
          background: "#f4f4f4",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "88px clamp(16px,3vw,40px)",
          }}
        >
          <div
            className="scroll-reveal-x"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              flexWrap: "wrap" as const,
              marginBottom: 40,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                color: "#7a8450",
                flex: "none",
              }}
            >
              Mitra &amp; kerja sama
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(32,30,29,.14)",
              }}
            />
            <Link
              href="/kemitraan"
              className="link-underline"
              style={{
                fontSize: 11,
                letterSpacing: ".16em",
                textTransform: "uppercase" as const,
                flex: "none",
                marginLeft: "auto",
                color: "#201e1d",
              }}
            >
              Jadi mitra &rarr;
            </Link>
          </div>
          <AdsCarousel />
        </div>
      </section>

      {/* ═══ MERCHANDISE ═══ */}
      <section
        style={{
          borderBottom: "1px solid rgba(32,30,29,.14)",
          background: "#f4f4f4",
        }}
      >
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "88px clamp(16px,3vw,40px)",
          }}
        >
          <div
            className="scroll-reveal-x"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 20,
              flexWrap: "wrap" as const,
              marginBottom: 40,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                color: "#7a8450",
                flex: "none",
              }}
            >
              Merchandise &middot; penunjang kegiatan
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(32,30,29,.14)",
              }}
            />
            <Link
              href="/merchandise"
              className="link-underline"
              style={{
                fontSize: 11,
                letterSpacing: ".16em",
                textTransform: "uppercase" as const,
                flex: "none",
                marginLeft: "auto",
                color: "#201e1d",
              }}
            >
              Lihat semua &rarr;
            </Link>
          </div>
          <div
            className="home-desktop-cards"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 24,
            }}
          >
            {featured.map((p, i) => (
              <Link
                key={p.slug}
                href={`/merchandise/${p.slug}`}
                className="beranda-product-card scroll-rise"
                style={{
                  display: "block",
                  borderRadius: 2,
                  overflow: "hidden",
                  "--cover": `${32 + i * 3}%`,
                } as React.CSSProperties}
              >
                <span
                  style={{
                    position: "relative",
                    display: "grid",
                    placeItems: "center",
                    aspectRatio: "4/3",
                    background: p.plate,
                    borderBottom: "1px solid rgba(32,30,29,.14)",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      fontSize: 72,
                      fontWeight: 700,
                      color: "rgba(32,30,29,.14)",
                      letterSpacing: "-.04em",
                    }}
                  >
                    {p.no}
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
                      fontSize: "9.5px",
                      letterSpacing: ".16em",
                      textTransform: "uppercase" as const,
                      background: p.badge.bg,
                      color: p.badge.fg,
                      padding: "4px 9px",
                      borderRadius: 2,
                    }}
                  >
                    {p.badge.label}
                  </span>
                </span>
                <span style={{ display: "block", padding: "20px 22px 22px" }}>
                  <span
                    style={{
                      display: "block",
                      fontSize: 19,
                      fontWeight: 600,
                      lineHeight: 1.24,
                    }}
                  >
                    {p.name}
                  </span>
                  <span
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      marginTop: 16,
                      borderTop: "1px solid rgba(32,30,29,.14)",
                      paddingTop: 14,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 21,
                        fontWeight: 700,
                        letterSpacing: "-.02em",
                        fontFeatureSettings: "'tnum'",
                      }}
                    >
                      {p.price}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        letterSpacing: ".1em",
                        textTransform: "uppercase" as const,
                        color: p.metaColor,
                      }}
                    >
                      {p.meta}
                    </span>
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="home-mobile-carousel">
            <HomeCarousels type="products" />
          </div>
        </div>
      </section>

      {/* ═══ SPONSOR LOGOS ═══ */}
      <section>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "60px clamp(16px,3vw,40px) 72px",
          }}
        >
          <div
            className="scroll-reveal-x"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 20,
              flexWrap: "wrap" as const,
              marginBottom: 30,
            }}
          >
            <span
              style={{
                fontSize: 11,
                letterSpacing: ".22em",
                textTransform: "uppercase" as const,
                color: "#605d5d",
                flex: "none",
              }}
            >
              Didukung oleh
            </span>
            <span
              className="scroll-hairline"
              style={{
                flex: 1,
                minWidth: 20,
                height: 1,
                background: "rgba(32,30,29,.14)",
              }}
            />
          </div>
          <SponsorStrip />
        </div>
      </section>
    </div>
  );
}
