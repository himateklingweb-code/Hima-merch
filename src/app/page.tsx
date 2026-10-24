/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { iconFromName } from "@/lib/icons";
import {
  getProducts,
  getArticles,
  getDepartments,
  getPartners,
} from "@/lib/content-repo";
import StatsCounter from "@/components/StatsCounter";
import HomeCarousels from "@/components/HomeCarousels";
import SponsorStrip from "@/components/SponsorStrip";
import { SITE, imageRatio } from "@/lib/site";

/** Waktu render server (dipakai untuk badge PO). Di luar komponen agar murni. */
function renderTime(): number {
  return Date.now();
}

// Content is read fresh at most once a minute; stock moves as orders come
// in, so a stale storefront would advertise things that are gone.
export const revalidate = 60;

export default async function HomePage() {
  const [products, articles, departments, partners] = await Promise.all([
    getProducts(),
    getArticles(),
    getDepartments(),
    getPartners(),
  ]);

  const now = renderTime();
  // BPH is the executive board, not a department — keep it out of the
  // "Departemen" grid and count, but its members still count as pengurus.
  const realDepartments = departments.filter((d) => d.slug !== "bph");
  const activeMembers = departments.reduce(
    (n, d) =>
      n +
      d.periods
        .filter((p) => p.is_active)
        .reduce((k, p) => k + p.members.length, 0),
    0
  );
  const stats = [
    { key: "pengurus", value: activeMembers, label: "Pengurus aktif" },
    { key: "dept", value: realDepartments.length, label: "Departemen" },
    { key: "produk", value: products.length, label: "Produk merchandise" },
    {
      key: "mitra",
      value: partners.length,
      label: "Mitra & sponsor",
      color: "#7a8450",
    },
  ];

  const poOpen = products.filter((p) => {
    if (p.stock_type !== "pre_order" || !p.po_deadline) return false;
    const taken = (p.po_filled ?? 0) + (p.po_reserved ?? 0);
    return new Date(p.po_deadline).getTime() > now && taken < (p.po_quota ?? 0);
  });
  // Badge "slot PO tersisa" hanya untuk pre-order yang benar-benar dibuka.
  const poPrimary = poOpen[0] ?? null;
  const poSisa = poPrimary
    ? Math.max(
        0,
        (poPrimary.po_quota ?? 0) -
          ((poPrimary.po_filled ?? 0) + (poPrimary.po_reserved ?? 0))
      )
    : 0;

  // Berita disorot dulu, lalu yang terbaru. Sorotan utama sebisa mungkin
  // artikel yang punya foto supaya bagian berita di beranda tidak polos.
  const sortedArticles = [...articles].sort((a, b) => {
    if (a.is_pinned !== b.is_pinned) return a.is_pinned ? -1 : 1;
    return new Date(b.published_at).getTime() - new Date(a.published_at).getTime();
  });
  const lead = sortedArticles.find((a) => a.image) ?? sortedArticles[0];
  const highlight = lead
    ? {
        ...lead,
        ratio: imageRatio(lead.image_width, lead.image_height, "16/10", 0.8, 1.9),
        ratioNum: lead.image_width && lead.image_height
          ? Math.min(1.9, Math.max(0.8, lead.image_width / lead.image_height))
          : 1.6,
        date: new Date(lead.published_at).toLocaleDateString("id-ID", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      }
    : null;
  const moreArticles = sortedArticles.filter((a) => a.id !== lead?.id).slice(0, 6);

  const tickerItems: string[] = [];
  products.forEach((p) => {
    if (p.stock_type !== "pre_order") return;
    const taken = (p.po_filled ?? 0) + (p.po_reserved ?? 0);
    const total = p.po_quota ?? 0;
    if (p.po_deadline && new Date(p.po_deadline).getTime() > now && taken < total) {
      tickerItems.push(`Pre-order ${p.name} dibuka · sisa ${total - taken} slot`);
    }
  });
  sortedArticles.slice(0, 3).forEach((a) => tickerItems.push(a.title));
  if (tickerItems.length < 3) {
    tickerItems.push(
      "Himpunan Mahasiswa Teknik Lingkungan UNTAN",
      "Kajian · Aksi Lapangan · Pengabdian",
      "Fakultas Teknik Universitas Tanjungpura"
    );
  }

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

        {/* Hero grid */}
        <div
          className="hero-grid"
          style={{
            position: "relative",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "clamp(22px,6vw,48px) clamp(16px,3vw,40px) 0",
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
                // Sized so the longest word — LINGKUNGAN — fits its column
                // with margin at every width; the old 9.5vw/124px overflowed
                // and clipped it. Tracking loosened from -.035em so the
                // display letters breathe.
                fontSize: "clamp(33px,7.4vw,94px)",
                lineHeight: 0.86,
                fontWeight: 700,
                letterSpacing: "-.01em",
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
                  fontSize: "clamp(15px,3.8vw,19px)",
                  lineHeight: 1.55,
                  maxWidth: "52ch",
                }}
              >
                Wadah resmi mahasiswa Program Studi Teknik Lingkungan
                Universitas Tanjungpura
                {realDepartments.length > 0
                  ? ` — ${realDepartments.length} departemen yang bergerak di kajian, aksi lapangan, dan pengabdian`
                  : " — bergerak di kajian, aksi lapangan, dan pengabdian"}{" "}
                untuk air, udara, dan tanah Kalimantan Barat.
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
                  padding: "clamp(12px,3.2vw,15px) clamp(20px,5.5vw,28px)",
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
                  padding: "clamp(11px,3vw,14px) clamp(18px,5vw,26px)",
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
            {/* Floating PO badge — hanya saat ada pre-order yang dibuka */}
            {poPrimary && (
            <Link
              href={`/merchandise/${poPrimary.slug}`}
              aria-label={`Pre-order ${poPrimary.name}: ${poSisa} slot tersisa`}
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
            )}
          </div>
        </div>

        {/* Scroll cue */}
        <div
          className="hero-cue"
          style={{
            position: "relative",
            maxWidth: 1280,
            margin: "0 auto",
            padding: "clamp(14px,4vw,32px) 40px clamp(12px,3vw,26px)",
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
            padding: "clamp(9px,2.4vw,13px) 0",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "max-content",
              animation:
                "marquee calc(34s * var(--mo,1)) linear infinite",
              fontSize: "clamp(10.5px,2.6vw,12.5px)",
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

      {/* ═══ BERITA ═══ */}
      <section style={{ borderBottom: "1px solid rgba(32,30,29,.14)" }}>
        <div className="section-pad">
          <SectionHead label="Berita terbaru" href="/berita" cta="Semua berita" />
          {highlight ? (
            <>
              <Link href={`/berita/${highlight.slug}`} className="home-news-feature scroll-reveal-x">
                <span
                  className="home-news-feature-media"
                  style={{
                    aspectRatio: highlight.ratio,
                    width: `min(100%, ${Math.round(460 * highlight.ratioNum)}px)`,
                  }}
                >
                  {highlight.image ? (
                    <img src={highlight.image} alt={highlight.image_alt || highlight.title} />
                  ) : (
                    <img src={SITE.logo} alt="" className="home-news-fallback" />
                  )}
                </span>
                <span className="home-news-feature-body">
                  <span className="home-news-meta">
                    {highlight.is_pinned && <span className="home-news-pin">Disorot</span>}
                    <span className="home-news-cat">{highlight.category}</span>
                    <span>{highlight.date}</span>
                  </span>
                  <span className="home-news-title">{highlight.title}</span>
                  {highlight.excerpt && (
                    <span className="home-news-excerpt">{highlight.excerpt}</span>
                  )}
                  <span className="home-news-more">Baca selengkapnya &rarr;</span>
                </span>
              </Link>
              {moreArticles.length > 0 && (
                <div style={{ marginTop: "clamp(24px,4vw,36px)" }}>
                  <HomeCarousels type="news" articles={moreArticles} />
                </div>
              )}
            </>
          ) : (
            <EmptyNote
              text="Belum ada berita yang terbit. Kabar kegiatan HMTL akan tampil di sini."
            />
          )}
        </div>
      </section>

      {/* ═══ PROFIL HIMA ═══ */}
      <section
        style={{
          borderBottom: "1px solid rgba(32,30,29,.14)",
          background: "#f4f4f4",
        }}
      >
        <div className="section-pad">
          <SectionHead label="Tentang kami" href="/tentang" cta="Profil lengkap" />

          <div className="profil-grid">
            <div>
              <h2
                className="scroll-reveal"
                style={{
                  margin: 0,
                  fontSize: "clamp(23px,5.6vw,52px)",
                  lineHeight: 1.04,
                  fontWeight: 700,
                  letterSpacing: "-.01em",
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
                  fontSize: "clamp(14px,3.5vw,17px)",
                  lineHeight: 1.6,
                  color: "#605d5d",
                  maxWidth: "52ch",
                }}
              >
                HMTL UNTAN menaungi aspirasi, pengembangan diri, dan
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
                    padding: "clamp(16px,4vw,20px) clamp(15px,4vw,22px)",
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
        <div className="section-pad">
          <SectionHead label="Struktur kepengurusan" href="/departemen" cta="Semua departemen" />

          <div
            className="home-desktop-cards"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
              gap: 20,
            }}
          >
            {realDepartments.map((dept, i) => {
              const Icon = iconFromName(dept.icon);
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
                    padding: "clamp(18px,4.5vw,26px) clamp(16px,4vw,24px)",
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
                      fontSize: "clamp(17px,4.4vw,20px)",
                      fontWeight: 700,
                      letterSpacing: "-.01em",
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
            <HomeCarousels type="departments" departments={realDepartments} />
          </div>
        </div>
      </section>

      {/* ═══ MERCHANDISE ═══ */}
      <section
        style={{
          borderBottom: "1px solid rgba(32,30,29,.14)",
          background: "#f4f4f4",
        }}
      >
        <div className="section-pad">
          <SectionHead label="Merchandise" href="/merchandise" cta="Lihat semua" />
          {products.length > 0 ? (
            <HomeCarousels type="products" products={products} />
          ) : (
            <EmptyNote text="Koleksi merchandise berikutnya sedang disiapkan. Pantau halaman Merchandise untuk info pre-order." />
          )}
        </div>
      </section>

      {/* ═══ DIDUKUNG OLEH ═══ */}
      {partners.length > 0 && (
        <section>
          <div className="section-pad-tight">
            <SectionHead label="Didukung oleh" href="/kemitraan" cta="Jadi mitra" muted />
            <SponsorStrip items={partners} />
          </div>
        </section>
      )}
    </div>
  );
}

/** Judul seksi beranda: label kecil, garis, dan tautan ke halaman lengkap. */
function SectionHead({
  label,
  href,
  cta,
  muted = false,
}: {
  label: string;
  href: string;
  cta: string;
  muted?: boolean;
}) {
  return (
    <div className="home-section-head scroll-reveal-x">
      <span className="home-section-label" style={muted ? { color: "#605d5d" } : undefined}>
        {label}
      </span>
      <span className="home-section-rule" aria-hidden />
      <Link href={href} className="home-section-cta link-underline">
        {cta} &rarr;
      </Link>
    </div>
  );
}

/** Pengganti seksi kosong — kalimat nyata, bukan kartu contoh. */
function EmptyNote({ text }: { text: string }) {
  return <p className="home-empty-note">{text}</p>;
}

