/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { departments } from "@/data/departments";
import { articles } from "@/data/news";
import { products, formatPrice } from "@/data/products";
import StatsCounter from "@/components/StatsCounter";
import HomeCarousels from "@/components/HomeCarousels";

function badgeOf(p: (typeof products)[0], now: number) {
  if (p.stock_type === "ready_stock") {
    const left = p.stock - p.stock_reserved;
    return left > 0
      ? { label: "Tersedia", bg: "#0088b0", fg: "#f3f2f2", state: "ready" }
      : { label: "Stok habis", bg: "#7d7979", fg: "#f3f2f2", state: "habis" };
  }
  const taken = (p.po_filled ?? 0) + (p.po_reserved ?? 0);
  const open =
    p.po_deadline &&
    new Date(p.po_deadline).getTime() > now &&
    taken < (p.po_quota ?? 0);
  return open
    ? { label: "Pre-order dibuka", bg: "#edbb00", fg: "#201e1d", state: "po" }
    : {
        label: "Pre-order ditutup",
        bg: "#aa0b56",
        fg: "#f3f2f2",
        state: "po-tutup",
      };
}

const PLATES = ["#d7d3d3", "#444141", "#d7d3d3", "#cbeeff", "#ffdee6"];

export default function HomePage() {
  const now = Date.now();

  const activeMemberCount = departments.reduce(
    (n, d) =>
      n +
      d.periods
        .filter((p) => p.is_active)
        .reduce((k, p) => k + p.members.length, 0),
    0
  );

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
        ? "#0088b0"
        : badge.state === "po"
          ? "#201e1d"
          : "#605d5d";
    return {
      slug: p.slug,
      no: String(i + 1).padStart(2, "0"),
      name: p.name,
      plate: PLATES[i] || "#d7d3d3",
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
    <div style={{ position: "relative", background: "#f3f2f2", minHeight: "100vh" }}>
      {/* ═══ HERO ═══ */}
      <section
        style={{
          position: "relative",
          overflow: "hidden",
          borderBottom: "1px solid rgba(32,30,29,.16)",
        }}
      >
        {/* Dot pattern */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            backgroundImage:
              "radial-gradient(circle,rgba(32,30,29,.16) 30%,transparent 32%)",
            backgroundSize: "4px 4px",
            opacity: 0.5,
            animation: "drift calc(38s * var(--mo,1)) ease-in-out infinite",
          }}
        />
        {/* Blobs */}
        <div
          style={{
            position: "absolute",
            top: -140,
            left: -120,
            width: 520,
            height: 520,
            borderRadius: "50%",
            background: "#0088b0",
            opacity: 0.09,
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
            background: "#d6006c",
            opacity: 0.08,
            filter: "blur(10px)",
            animation:
              "drift calc(31s * var(--mo,1)) ease-in-out infinite reverse",
          }}
        />

        {/* Meta bar */}
        <div
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
              borderBottom: "1px solid rgba(32,30,29,.16)",
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
                  background: "#d6006c",
                  animation:
                    "blink calc(1.6s * var(--mo,1)) steps(1,end) infinite",
                }}
              />
              Pre-order dibuka
            </span>
            <span
              className="hero-divider"
              style={{
                flex: 1,
                minWidth: 20,
                height: 1,
                background: "rgba(32,30,29,.16)",
              }}
            />
            <span>hima.tekniklingkungan.com</span>
            <span style={{ color: "rgba(32,30,29,.35)" }}>/</span>
            <span>Edisi 2025 / 2026</span>
            <span style={{ color: "rgba(32,30,29,.35)" }}>/</span>
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
                color: "#0088b0",
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
                UNTAN<span style={{ color: "#d6006c" }}>.</span>
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
                className="beranda-hero-cta"
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

          {/* Right — image */}
          <div style={{ position: "relative" }}>
            <figure
              style={{
                position: "relative",
                margin: 0,
                aspectRatio: "4/5",
                overflow: "hidden",
                background: "#e0dede",
                border: "1px solid rgba(32,30,29,.16)",
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
                  filter: "grayscale(1) contrast(1.35) brightness(1.05)",
                  mixBlendMode: "multiply",
                }}
              />
              <img
                src="/assets/plate.jpg"
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "grayscale(1) brightness(1.5) sepia(1) hue-rotate(150deg) saturate(4.5)",
                  mixBlendMode: "multiply",
                  opacity: 0.72,
                  animation:
                    "misreg calc(9s * var(--mo,1)) ease-in-out infinite",
                }}
              />
              <img
                src="/assets/plate.jpg"
                alt=""
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  filter:
                    "grayscale(1) brightness(1.55) sepia(1) hue-rotate(275deg) saturate(6)",
                  mixBlendMode: "multiply",
                  opacity: 0.6,
                  animation:
                    "misreg calc(11s * var(--mo,1)) ease-in-out infinite reverse",
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
                  background: "rgba(243,242,242,.92)",
                  fontSize: 10,
                  letterSpacing: ".14em",
                  textTransform: "uppercase" as const,
                  color: "#605d5d",
                  borderTop: "1px solid rgba(32,30,29,.16)",
                }}
              >
                Plat proses C&middot;M&middot;K — dokumentasi kegiatan
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
                  background: "#edbb00",
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
                background: "rgba(32,30,29,.35)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "#d6006c",
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
            color: "#f3f2f2",
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
                  <span key={`d${i}`} style={{ color: "#edbb00" }}>
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
          borderBottom: "1px solid rgba(32,30,29,.16)",
          background: "#eae9e9",
        }}
      >
        <StatsCounter
          targets={[
            { key: "pengurus", value: activeMemberCount, label: "Pengurus aktif" },
            { key: "dept", value: departments.length, label: "Departemen" },
            { key: "produk", value: products.length, label: "Produk merchandise" },
            {
              key: "pohon",
              value: 1000,
              label: "Pohon mangrove ditanam",
              color: "#0088b0",
            },
          ]}
        />
      </section>

      {/* ═══ QUICK LINKS ═══ */}
      <section style={{ borderBottom: "1px solid rgba(32,30,29,.16)" }}>
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
                color: "#0088b0",
                flex: "none",
              }}
            >
              Mulai dari sini
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(32,30,29,.16)",
              }}
            />
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
              gap: 20,
            }}
          >
            {[
              {
                href: "/merchandise",
                no: "01",
                title: "Pesan merchandise",
                desc: "Etalase dengan filter ready stock dan pre-order, lengkap dengan kuota batch.",
              },
              {
                href: "/pesanan/cek",
                no: "02",
                title: "Lacak pesanan",
                desc: "Masukkan kode pesanan, lihat status pembayaran dan verifikasi kasir.",
              },
              {
                href: "/departemen",
                no: "03",
                title: "Kenali pengurus",
                desc: "Bagan enam departemen beserta arsip kepengurusan periode sebelumnya.",
              },
            ].map((card, i) => (
              <Link
                key={card.no}
                href={card.href}
                className="beranda-quick-card scroll-rise"
                style={{
                  display: "grid",
                  gap: 12,
                  padding: "30px 28px",
                  borderRadius: 2,
                  "--cover": `${30 + i * 3}%`,
                } as React.CSSProperties}
              >
                <span
                  style={{
                    fontSize: "10.5px",
                    letterSpacing: ".2em",
                    textTransform: "uppercase" as const,
                    color: "#605d5d",
                  }}
                >
                  {card.no}
                </span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    letterSpacing: "-.02em",
                    lineHeight: 1.1,
                  }}
                >
                  {card.title}
                </span>
                <span
                  style={{
                    fontSize: "14.5px",
                    lineHeight: 1.55,
                    color: "#605d5d",
                  }}
                >
                  {card.desc}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ MERCHANDISE ═══ */}
      <section
        style={{
          borderBottom: "1px solid rgba(32,30,29,.16)",
          background: "#eae9e9",
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
                color: "#0088b0",
                flex: "none",
              }}
            >
              Merchandise unggulan
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(32,30,29,.16)",
              }}
            />
            <Link
              href="/merchandise"
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
                    borderBottom: "1px solid rgba(32,30,29,.16)",
                    overflow: "hidden",
                  }}
                >
                  <span
                    style={{
                      fontSize: 72,
                      fontWeight: 700,
                      color: "rgba(32,30,29,.16)",
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
                      borderTop: "1px solid rgba(32,30,29,.16)",
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

      {/* ═══ NEWS ═══ */}
      <section style={{ borderBottom: "1px solid rgba(32,30,29,.16)" }}>
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
                color: "#0088b0",
                flex: "none",
              }}
            >
              Berita terbaru
            </span>
            <span
              style={{
                flex: 1,
                height: 1,
                background: "rgba(32,30,29,.16)",
              }}
            />
            <Link
              href="/berita"
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
                  border: "1px solid rgba(32,30,29,.35)",
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
    </div>
  );
}
