/**
 * Peran panel admin dan menu yang boleh dibuka masing-masing.
 *
 * Ini hanya menentukan apa yang DITAMPILKAN. Penjaga sebenarnya ada di
 * database (RLS + RPC di migrasi 0009), jadi menyembunyikan menu di sini
 * tidak pernah menjadi satu-satunya pengaman.
 */
export type StaffRole = "admin" | "kwu" | "kominfo";

export const STAFF_ROLES: StaffRole[] = ["admin", "kwu", "kominfo"];

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  kwu: "KWU",
  kominfo: "Kominfo",
};

export const ROLE_NOTE: Record<StaffRole, string> = {
  admin: "Semua menu, termasuk Pengguna dan Absensi",
  kwu: "Produk, pesanan, mitra, dan iklan",
  kominfo: "Berita, departemen, SEO, mitra, dan iklan",
};

export const ROLE_BADGE: Record<StaffRole, string> = {
  admin: "bg-red-50 text-red-700 ring-red-200",
  kwu: "bg-amber-50 text-amber-800 ring-amber-200",
  kominfo: "bg-sky-50 text-sky-800 ring-sky-200",
};

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "kwu" || value === "kominfo";
}

/** Menu panel dan peran yang boleh membukanya. */
export const ADMIN_SECTIONS: { href: string; roles: StaffRole[] }[] = [
  { href: "/admin", roles: ["admin", "kwu", "kominfo"] },
  { href: "/admin/produk", roles: ["admin", "kwu"] },
  { href: "/admin/pesanan", roles: ["admin", "kwu"] },
  { href: "/admin/departemen", roles: ["admin", "kominfo"] },
  { href: "/admin/berita", roles: ["admin", "kominfo"] },
  { href: "/admin/mitra", roles: ["admin", "kwu", "kominfo"] },
  { href: "/admin/iklan", roles: ["admin", "kwu", "kominfo"] },
  { href: "/admin/seo", roles: ["admin", "kominfo"] },
  { href: "/admin/absensi", roles: ["admin"] },
  { href: "/admin/pengguna", roles: ["admin"] },
];

/** Boleh membuka path ini? Dicocokkan ke menu dengan awalan terpanjang. */
export function canAccess(role: StaffRole | null, pathname: string): boolean {
  if (!role) return false;
  const match = ADMIN_SECTIONS.filter(
    (s) => pathname === s.href || pathname.startsWith(`${s.href}/`)
  ).sort((a, b) => b.href.length - a.href.length)[0];
  return match ? match.roles.includes(role) : role === "admin";
}
