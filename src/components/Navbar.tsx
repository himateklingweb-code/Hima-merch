"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { Menu, X, ShoppingBag, User } from "lucide-react";
import { useCart } from "./CartContext";
import { useAuth } from "./AuthContext";

const navLinks = [
  { href: "/", label: "Beranda", key: "beranda" },
  { href: "/tentang", label: "Tentang", key: "tentang" },
  { href: "/departemen", label: "Kepengurusan", key: "departemen" },
  { href: "/merchandise", label: "Merchandise", key: "merch" },
  { href: "/berita", label: "Berita", key: "berita" },
  { href: "/pesanan/cek", label: "Cek Pesanan", key: "pesanan" },
  { href: "/kontak", label: "Kontak", key: "kontak" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { itemCount } = useCart();
  const { user, avatarUrl } = useAuth();

  const activeKey =
    navLinks.find((l) => l.href === pathname)?.key || "";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Past the first slice of the page the bar goes dark, matching the
  // footer, so it reads as a solid header rather than a tinted overlay.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      data-scrolled={scrolled || menuOpen ? "true" : "false"}
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        backdropFilter: "blur(10px) saturate(1.2)",
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
            className="site-nav-mark"
            style={{
              width: 30,
              height: 30,
              borderRadius: 2,
              display: "grid",
              placeItems: "center",
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "-.02em",
              flexShrink: 0,
            }}
          >
            TL
          </span>
          <span style={{ display: "grid", lineHeight: 1.05, minWidth: 0 }}>
            <span
              className="site-nav-title"
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
              className="site-nav-sub"
              style={{
                fontSize: "9.5px",
                letterSpacing: ".19em",
                textTransform: "uppercase",
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
            className="site-nav-toggle"
            data-open={menuOpen ? "true" : "false"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              padding: "9px 15px",
              borderRadius: 2,
              fontSize: "11.5px",
              letterSpacing: ".12em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            {menuOpen ? (
              <X size={15} strokeWidth={2} />
            ) : (
              <Menu size={15} strokeWidth={2} />
            )}
            <span className="site-nav-toggle-label">Menu</span>
          </button>
        </div>

        {/* Account — signed-in users go to their orders, guests to sign in.
            Sits beside the basket, reachable at every width. */}
        <Link
          href={user ? "/akun" : "/masuk"}
          className="site-nav-cart"
          aria-label={user ? "Akun saya" : "Masuk"}
          title={user ? "Akun saya" : "Masuk"}
        >
          {user && avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              width={38}
              height={38}
              referrerPolicy="no-referrer"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                borderRadius: 2,
              }}
            />
          ) : (
            <User size={17} strokeWidth={1.9} />
          )}
        </Link>

        {/* Basket — sits outside the hamburger so it stays reachable at
            every width, and only draws attention once it has something. */}
        <Link
          href="/keranjang"
          className="site-nav-cart"
          aria-label={
            itemCount > 0
              ? `Keranjang, ${itemCount} item`
              : "Keranjang belanja"
          }
        >
          <ShoppingBag size={17} strokeWidth={1.9} />
          {itemCount > 0 && (
            <span className="site-nav-cart-count">{itemCount}</span>
          )}
        </Link>
      </div>

      {/* Mobile menu panel */}
      {menuOpen && (
        <div
          className="site-nav-panel"
          style={{ animation: "popIn .28s ease-out both" }}
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
              href={user ? "/akun" : "/masuk"}
              className="site-nav-mobile-link"
              onClick={() => setMenuOpen(false)}
              style={{
                padding: "12px 14px",
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                gap: 9,
              }}
            >
              <User size={16} strokeWidth={1.9} />
              {user ? "Akun Saya" : "Masuk / Daftar"}
            </Link>
            <Link
              href="/merchandise"
              onClick={() => setMenuOpen(false)}
              className="site-nav-panel-cta"
              style={{
                marginTop: 10,
                textAlign: "center",
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
