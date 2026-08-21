import Link from "next/link";

const footerLinks = [
  { href: "/merchandise", label: "Etalase & pre-order", cat: "Merch" },
  { href: "/pesanan/cek", label: "Cek status pesanan", cat: "Pesanan" },
  { href: "/departemen", label: "Pengurus & pendahulu", cat: "Struktur" },
  { href: "/berita", label: "Kegiatan & prestasi", cat: "Berita" },
  { href: "/admin/login", label: "Dashboard kasir", cat: "Internal" },
];

// lucide-react (this build) ships no brand marks, so the social glyphs
// are inlined. TODO: swap the placeholder hrefs for the real HMTL
// account URLs.
const socials = [
  {
    label: "Instagram",
    href: "https://instagram.com",
    path: "M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.9 5.9 0 00-2.13 1.38A5.9 5.9 0 00.63 4.14C.33 4.9.13 5.78.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.15.56 2.91.3.79.71 1.46 1.38 2.13.67.66 1.34 1.07 2.13 1.38.76.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.15-.26 2.91-.56.79-.31 1.46-.72 2.13-1.38.66-.67 1.07-1.34 1.38-2.13.3-.76.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.15-.56-2.91a5.9 5.9 0 00-1.38-2.13A5.9 5.9 0 0019.86.63c-.76-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84A6.16 6.16 0 105.84 12 6.16 6.16 0 0012 5.84zm0 10.16A4 4 0 118 12a4 4 0 014 4zm6.4-10.4a1.44 1.44 0 11-1.44-1.44 1.44 1.44 0 011.44 1.44z",
  },
  {
    label: "Facebook",
    href: "https://facebook.com",
    path: "M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z",
  },
  {
    label: "Twitter",
    href: "https://twitter.com",
    path: "M23.95 4.57c-.88.39-1.83.65-2.83.77a4.96 4.96 0 002.17-2.72c-.95.56-2.01.97-3.13 1.19a4.92 4.92 0 00-8.39 4.49A13.98 13.98 0 011.64 3.16a4.93 4.93 0 001.52 6.57 4.9 4.9 0 01-2.23-.62v.06a4.93 4.93 0 003.95 4.83 4.94 4.94 0 01-2.22.08 4.93 4.93 0 004.6 3.42A9.87 9.87 0 010 20.29a13.94 13.94 0 007.55 2.21c9.05 0 14-7.5 14-14 0-.21 0-.43-.02-.64A9.94 9.94 0 0024 4.59z",
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
          <span>&copy; {new Date().getFullYear()} HIMA Teknik Lingkungan UNTAN</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              flexWrap: "wrap",
            }}
          >
            <span>hima.tekniklingkungan.com</span>
            <span aria-hidden="true" style={{ opacity: 0.4 }}>
              /
            </span>
            <a
              href="https://sayba.id"
              target="_blank"
              rel="noopener noreferrer"
              className="site-watermark link-underline"
              style={{ letterSpacing: ".16em" }}
            >
              Dirancang oleh sayba.arc
            </a>
          </span>
        </div>
      </div>
    </footer>
  );
}
