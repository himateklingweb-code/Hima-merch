import Link from "next/link";

const footerLinks = [
  { href: "/merchandise", label: "Etalase & pre-order", cat: "Merch" },
  { href: "/pesanan/cek", label: "Cek status pesanan", cat: "Pesanan" },
  { href: "/departemen", label: "Pengurus & pendahulu", cat: "Struktur" },
  { href: "/berita", label: "Kegiatan & prestasi", cat: "Berita" },
  { href: "/admin/login", label: "Dashboard kasir", cat: "Internal" },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: "#201e1d",
        color: "#f3f2f2",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "80px clamp(16px,3vw,40px) 48px",
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
                fontSize: "clamp(34px,4.8vw,68px)",
                lineHeight: 0.98,
                fontWeight: 700,
                letterSpacing: "-.035em",
              }}
            >
              Sekretariat
              <br />
              <span
                style={{
                  color: "transparent",
                  WebkitTextStroke: "1.4px #f3f2f2",
                } as React.CSSProperties}
              >
                HIMA TL
              </span>
            </h2>
            <p
              style={{
                margin: "24px 0 0",
                fontSize: "16.5px",
                lineHeight: 1.6,
                color: "rgba(243,242,242,.72)",
                maxWidth: "44ch",
              }}
            >
              Gedung Fakultas Teknik, Universitas Tanjungpura, Jalan
              Prof. Dr. H. Hadari Nawawi, Pontianak, Kalimantan Barat.
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
                className="site-footer-cta-primary"
                style={{
                  padding: "14px 24px",
                  borderRadius: 2,
                  fontSize: "12.5px",
                  letterSpacing: ".09em",
                  textTransform: "uppercase",
                }}
              >
                WhatsApp kasir
              </Link>
              <Link
                href="/kontak"
                className="site-footer-cta-outline"
                style={{
                  padding: "13px 22px",
                  borderRadius: 2,
                  fontSize: "12.5px",
                  letterSpacing: ".09em",
                  textTransform: "uppercase",
                }}
              >
                Instagram
              </Link>
            </div>
          </div>

          {/* Right */}
          <div>
            <div
              style={{
                display: "grid",
                gap: 0,
                borderTop: "1px solid rgba(243,242,242,.2)",
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
                      color: "rgba(243,242,242,.6)",
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
            borderTop: "1px solid rgba(243,242,242,.2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "10.5px",
            letterSpacing: ".16em",
            textTransform: "uppercase",
            color: "rgba(243,242,242,.6)",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <span>&copy; {new Date().getFullYear()} HIMA Teknik Lingkungan UNTAN</span>
          <span>hima.tekniklingkungan.com</span>
        </div>
      </div>
    </footer>
  );
}
