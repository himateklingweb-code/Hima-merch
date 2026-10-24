/**
 * Akses panel admin.
 *
 * Hanya dua peran di tabel `staff`:
 *   - admin    : semua menu, termasuk Absensi dan Pengguna.
 *   - pengurus : boleh masuk panel; menunya mengikuti izin departemennya
 *                (tabel `department_access`, diatur admin).
 *
 * Akun tanpa peran tapi punya departemen = anggota (bisa absen).
 * Akun tanpa peran dan tanpa departemen = pengunjung.
 *
 * Ini hanya menentukan apa yang DITAMPILKAN. Penjaga sebenarnya ada di
 * database (RLS + RPC, migrasi 0010).
 */
export type StaffRole = "admin" | "pengurus";

export const STAFF_ROLES: StaffRole[] = ["admin", "pengurus"];

export const ROLE_LABEL: Record<StaffRole, string> = {
  admin: "Admin",
  pengurus: "Pengurus",
};

export function isStaffRole(value: unknown): value is StaffRole {
  return value === "admin" || value === "pengurus";
}

/** Menu yang izinnya bisa diberikan ke departemen. */
export type Section =
  | "produk"
  | "pesanan"
  | "berita"
  | "departemen"
  | "mitra"
  | "seo";

/** Menu khusus admin, tidak bisa diberikan ke departemen. */
export type AdminOnlySection = "absensi" | "pengguna";

export const SECTIONS: { key: Section; label: string; note: string }[] = [
  { key: "produk", label: "Produk", note: "Tambah & ubah merchandise" },
  { key: "pesanan", label: "Pesanan", note: "Verifikasi pesanan & bukti bayar" },
  { key: "berita", label: "Berita", note: "Tulis & terbitkan artikel" },
  { key: "departemen", label: "Departemen", note: "Struktur & anggota kepengurusan" },
  { key: "mitra", label: "Mitra & Sponsor", note: "Logo mitra & sponsor di situs" },
  { key: "seo", label: "SEO", note: "Judul & deskripsi halaman" },
];

export const SECTION_LABEL = Object.fromEntries(
  SECTIONS.map((s) => [s.key, s.label])
) as Record<Section, string>;

export function isSection(value: unknown): value is Section {
  return SECTIONS.some((s) => s.key === value);
}

/** Status akun untuk filter dan label. */
export type AccountKind = "admin" | "pengurus" | "anggota" | "pengunjung";

export function accountKind(
  role: StaffRole | null,
  departmentId: string | null
): AccountKind {
  if (role) return role;
  return departmentId ? "anggota" : "pengunjung";
}

export const KIND_LABEL: Record<AccountKind, string> = {
  admin: "Admin",
  pengurus: "Pengurus",
  anggota: "Anggota",
  pengunjung: "Pengunjung",
};

export const KIND_BADGE: Record<AccountKind, string> = {
  admin: "bg-red-50 text-red-700 ring-red-200",
  pengurus: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  anggota: "bg-sky-50 text-sky-800 ring-sky-200",
  pengunjung: "bg-gray-100 text-gray-600 ring-gray-200",
};

/** Menu panel: path dan izin yang dibutuhkan. `null` = semua pengurus. */
export const ADMIN_SECTIONS: {
  href: string;
  need: Section | AdminOnlySection | null;
}[] = [
  { href: "/admin", need: null },
  { href: "/admin/produk", need: "produk" },
  { href: "/admin/pesanan", need: "pesanan" },
  { href: "/admin/departemen", need: "departemen" },
  { href: "/admin/berita", need: "berita" },
  { href: "/admin/mitra", need: "mitra" },
  { href: "/admin/seo", need: "seo" },
  { href: "/admin/absensi", need: "absensi" },
  { href: "/admin/pengguna", need: "pengguna" },
];

export function canOpen(
  role: StaffRole | null,
  sections: readonly string[],
  need: Section | AdminOnlySection | null
): boolean {
  if (!role) return false;
  if (role === "admin") return true;
  if (need === null) return true;
  if (need === "absensi" || need === "pengguna") return false;
  return sections.includes(need);
}

/** Boleh membuka path ini? Dicocokkan ke menu dengan awalan terpanjang. */
export function canAccess(
  role: StaffRole | null,
  sections: readonly string[],
  pathname: string
): boolean {
  const match = ADMIN_SECTIONS.filter(
    (s) => pathname === s.href || pathname.startsWith(`${s.href}/`)
  ).sort((a, b) => b.href.length - a.href.length)[0];
  if (!match) return role === "admin";
  return canOpen(role, sections, match.need);
}
