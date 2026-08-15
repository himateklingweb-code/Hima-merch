"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/", label: "Beranda", key: "beranda" },
  { href: "/tentang", label: "Tentang", key: "tentang" },
  { href: "/departemen", label: "Departemen", key: "departemen" },
  { href: "/merchandise", label: "Merchandise", key: "merch" },
  { href: "/berita", label: "Berita", key: "berita" },
  { href: "/pesanan/cek", label: "Cek Pesanan", key: "pesanan" },
  { href: "/kontak", label: "Kontak", key: "kontak" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  const activeKey =
    navLinks.find((l) => l.href === pathname)?.key || "";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    const onResize = () => {
      if (window.innerWidth >= 1080) setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <header
      data-nav=""
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "rgba(243,242,242,.92)",
        backdropFilter: "blur(10px) saturate(1.2)",
        borderBottom: "1px solid rgba(32,30,29,.16)",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "12px clamp(16px,3vw,40px)",
          display: "flex",
          alignItems: "center",
          gap: "clamp(12px,2vw,32px)",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={() => setMenuOpen(false)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 11,
            flexShrink: 1,
            minWidth: 0,
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              border: "1.5px solid #201e1d",
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-.02em",
              background: "#edbb00",
              flexShrink: 0,
            }}
          >
            TL
          </span>
          <span style={{ display: "grid", lineHeight: 1.05, minWidth: 0 }}>
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                letterSpacing: "-.01em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              HIMA Teknik Lingkungan
            </span>
            <span
              style={{
                fontSize: "9.5px",
                letterSpacing: ".19em",
                textTransform: "uppercase",
                color: "#605d5d",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              Universitas Tanjungpura
            </span>
          </span>
        </Link>

        {/* Desktop nav */}
        <nav
          className="nav-desktop"
          style={{
            display: "flex",
            gap: 2,
            flex: "1 1 auto",
            minWidth: 0,
            justifyContent: "center",
            fontSize: "12.5px",
            letterSpacing: ".03em",
          }}
        >
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={activeKey === link.key ? "page" : undefined}
              className="site-nav-link"
              style={{
                padding: "7px 11px",
                borderRadius: 2,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile menu button */}
        <div
          className="nav-mobile-toggle"
          style={{
            flex: "1 1 auto",
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-expanded={menuOpen}
            aria-label="Menu navigasi"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              border: "1px solid #201e1d",
              background: menuOpen ? "#201e1d" : "transparent",
              color: menuOpen ? "#f3f2f2" : "#201e1d",
              padding: "9px 15px",
              borderRadius: 2,
              fontSize: "11.5px",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "background .2s, color .2s",
            }}
          >
            {menuOpen ? (
              <X size={15} strokeWidth={2} />
            ) : (
              <Menu size={15} strokeWidth={2} />
            )}
            Menu
          </button>
        </div>

        {/* CTA */}
        <Link
          href="/merchandise"
          className="site-nav-cta"
          style={{
            flexShrink: 0,
            whiteSpace: "nowrap",
            padding: "9px clamp(12px,1.4vw,18px)",
            borderRadius: 2,
            fontSize: "12.5px",
            letterSpacing: ".06em",
            textTransform: "uppercase",
          }}
        >
          Pesan Merch
        </Link>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div
          style={{
            borderTop: "1px solid rgba(32,30,29,.16)",
            background: "#f3f2f2",
            animation: "popIn .28s ease-out both",
          }}
        >
          <nav
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              padding: "10px clamp(16px,3vw,40px) 18px",
              display: "grid",
              gap: 2,
              fontSize: 15,
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                aria-current={
                  activeKey === link.key ? "page" : undefined
                }
                className="site-nav-mobile-link"
                onClick={() => setMenuOpen(false)}
                style={{ padding: "12px 14px", borderRadius: 2 }}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/merchandise"
              onClick={() => setMenuOpen(false)}
              style={{
                marginTop: 10,
                textAlign: "center",
                background: "#201e1d",
                color: "#f3f2f2",
                padding: "14px 16px",
                borderRadius: 2,
                fontSize: "12.5px",
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              Pesan Merch
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
