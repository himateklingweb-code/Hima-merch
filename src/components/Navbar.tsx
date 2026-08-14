"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";

const navLinks = [
  { href: "/", label: "Beranda" },
  {
    label: "Tentang",
    children: [
      { href: "/tentang", label: "Tentang Kami" },
      { href: "/tentang#visi-misi", label: "Visi & Misi" },
      { href: "/tentang#sejarah", label: "Sejarah" },
    ],
  },
  { href: "/departemen", label: "Departemen" },
  { href: "/kemitraan", label: "Kemitraan" },
  { href: "/merchandise", label: "Merchandise" },
  { href: "/berita", label: "Berita" },
  { href: "/kontak", label: "Kontak" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState<string | null>(null);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-gray-200">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 lg:h-16">
            <Link href="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
              <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs lg:text-sm">
                TL
              </div>
              <div>
                <div className="font-bold text-emerald-800 text-xs lg:text-sm leading-tight">HIMA Teknik Lingkungan</div>
                <div className="text-[10px] lg:text-[11px] text-gray-500 leading-tight hidden sm:block">Universitas Tanjungpura</div>
              </div>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) =>
                "children" in link && link.children ? (
                  <div
                    key={link.label}
                    className="relative"
                    onMouseEnter={() => setDropdownOpen(link.label)}
                    onMouseLeave={() => setDropdownOpen(null)}
                  >
                    <button className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1">
                      {link.label}
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    {dropdownOpen === link.label && (
                      <div className="absolute top-full left-0 mt-0.5 w-48 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-50">
                        {link.children.map((child) => (
                          <Link
                            key={child.href}
                            href={child.href}
                            className="block px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <Link
                    key={link.href}
                    href={link.href!}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                  >
                    {link.label}
                  </Link>
                )
              )}
            </div>

            {/* Mobile burger */}
            <button
              className="lg:hidden p-2 -mr-1 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </nav>
      </header>

      {/* Mobile menu - full overlay, rendered outside header to avoid backdrop-blur containing block */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 top-14 z-40 bg-white overflow-y-auto">
          <nav className="px-4 py-3 space-y-1">
            {navLinks.map((link) =>
              "children" in link && link.children ? (
                <div key={link.label}>
                  <button
                    className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-base font-medium text-gray-800 active:bg-gray-100"
                    onClick={() =>
                      setDropdownOpen(dropdownOpen === link.label ? null : link.label)
                    }
                  >
                    {link.label}
                    <ChevronDown
                      className={`w-4 h-4 text-gray-400 transition-transform ${
                        dropdownOpen === link.label ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {dropdownOpen === link.label && (
                    <div className="ml-3 border-l-2 border-emerald-200 pl-3 space-y-0.5 mb-1">
                      {link.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className="flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm text-gray-600 active:bg-emerald-50"
                          onClick={() => setMobileOpen(false)}
                        >
                          <ChevronRight className="w-3.5 h-3.5 text-emerald-500" />
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={link.href}
                  href={link.href!}
                  className="block px-3 py-3 rounded-xl text-base font-medium text-gray-800 active:bg-gray-100"
                  onClick={() => setMobileOpen(false)}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* Mobile quick links */}
          <div className="px-4 pt-4 pb-6 border-t border-gray-100 mt-2">
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/pesanan/cek"
                className="flex items-center justify-center gap-1.5 py-3 bg-emerald-50 rounded-xl text-sm font-medium text-emerald-700 active:bg-emerald-100"
                onClick={() => setMobileOpen(false)}
              >
                Cek Pesanan
              </Link>
              <Link
                href="/admin/login"
                className="flex items-center justify-center gap-1.5 py-3 bg-gray-100 rounded-xl text-sm font-medium text-gray-600 active:bg-gray-200"
                onClick={() => setMobileOpen(false)}
              >
                Admin
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
