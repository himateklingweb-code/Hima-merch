import Link from "next/link";

const footerLinks = [
  { href: "/merchandise", label: "Etalase & pre-order", cat: "Merch" },
  { href: "/pesanan/cek", label: "Cek status pesanan", cat: "Pesanan" },
  { href: "/departemen", label: "Pengurus & pendahulu", cat: "Struktur" },
  { href: "/berita", label: "Kegiatan & prestasi", cat: "Berita" },
  { href: "/kemitraan", label: "Kerja sama & sponsor", cat: "Mitra" },
];

// lucide-react (this build) ships no brand marks, so the Instagram glyph is
// inlined. Facebook/Twitter were dropped — no confirmed active accounts yet.
// User will supply the real HMTL handle later; this points at the generic
// app for now.
const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 00-2.13 1.38A5.9 5.9 0 00.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 00-1.38-2.13A5.9 5.9 0 0019.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 105.84 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 118 12a4 4 0 014 4zm6.4-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z",
  },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "#201e1d",
        color: "#ffffff",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "clamp(44px,8vw,80px) clamp(16px,3vw,40px) 36px",
        }}
      >
        <div
          className="footer-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0,1.25fr) minmax(0,.75fr)",
            gap: 64,
            alignItems: "start",
          }}
        >
          {/* Left */}
          <div>
            <h2
              className="scroll-reveal"
              style={{
                margin: 0,
                fontSize: "clamp(26px,7vw,68px)",
                lineHeight: 0.98,
                fontWeight: 700,
                letterSpacing: "-.01em",
              }}
            >
              Sekretariat
              <br />
              <span
                style={{
                  color: "transparent",
                  WebkitTextStroke: "1.4px #ffffff",
                } as React.CSSProperties}
              >
                HMTL
              </span>
            </h2>
            <p
              style={{
                margin: "24px 0 0",
                fontSize: "clamp(14px,3.5vw,16.5px)",
                lineHeight: 1.6,
                color: "rgba(255,255,255,.72)",
                maxWidth: "44ch",
              }}
            >
              Jalan Prof. Dr. Hadari Nawawi, Komp. UKM Fakultas Teknik,
              Universitas Tanjungpura, Pontianak 78124.
            </p>
            <div
              style={{
                marginTop: 30,
                display: "flex",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Link
                href="/kontak"
                className="site-footer-cta-primary btn-sheen"
                style={{
                  padding: "14px 24px",
                  borderRadius: 2,
                  fontSize: "12.5px",
                  letterSpacing: ".09em",
                  textTransform: "uppercase",
                }}
              >
                Hubungi kami
              </Link>
            </div>

            {/* Social accounts */}
            <div style={{ marginTop: 34 }}>
              <div
                style={{
                  fontSize: "10.5px",
                  letterSpacing: ".18em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,.5)",
                  marginBottom: 14,
                }}
              >
                Ikuti kami
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={s.label}
                    className="site-footer-social"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      width={18}
                      height={18}
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d={s.path} />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Right */}
          <div>
            <div
              style={{
                display: "grid",
                gap: 0,
                borderTop: "1px solid rgba(255,255,255,.2)",
              }}
            >
              {footerLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="site-footer-link"
                  style={{
                    display: "grid",
                    gridTemplateColumns: "104px 1fr",
                    gap: 16,
                    padding: "14px 0",
                    fontSize: "14.5px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "10.5px",
                      letterSpacing: ".16em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,.6)",
                    }}
                  >
                    {link.cat}
                  </span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div
          style={{
            marginTop: 56,
            paddingTop: 22,
            borderTop: "1px solid rgba(255,255,255,.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "10.5px",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "rgba(255,255,255,.6)",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>&copy; {new Date().getFullYear()} HIMA Teknik Lingkungan UNTAN</span>
            <span aria-hidden="true" style={{ opacity: 0.4 }}>
              /
            </span>
            <Link href="/privasi" className="link-underline">
              Kebijakan Privasi
            </Link>
          </span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <a
              href="https://sayba.id"
              target="_blank"
              rel="noopener noreferrer"
              className="site-watermark link-underline"
              style={{ letterSpacing: ".16em" }}
            >
              Powered By Sayba Arc
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
