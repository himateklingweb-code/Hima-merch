/**
 * Kontak resmi HMTL UNTAN — satu sumber untuk footer, halaman Kontak,
 * Kemitraan, dan checkout. Nilai kosong berarti tautannya disembunyikan,
 * bukan diarahkan ke halaman generik.
 */
export const SITE = {
  name: "HMTL UNTAN",
  fullName: "Himpunan Mahasiswa Teknik Lingkungan Universitas Tanjungpura",
  logo: "/logo-hmtl.png",
  email: "hmtl.ft.untan13@gmail.com",
  whatsapp: "6281218542747",
  whatsappLabel: "+62 812-1854-2747",
  /** Isi dengan URL akun resmi (mis. https://instagram.com/namaakun). */
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM_URL ?? "",
  address: [
    "Komp. UKM Fakultas Teknik, Universitas Tanjungpura",
    "Jl. Prof. Dr. Hadari Nawawi",
    "Pontianak 78124",
  ],
} as const;

export const waLink = (text?: string) =>
  `https://wa.me/${SITE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ""}`;

/**
 * Rasio tampilan gambar unggahan. Mengikuti rasio asli file, tetapi dibatasi
 * supaya foto potret yang sangat tinggi atau panorama yang sangat lebar tidak
 * merusak tata letak kartu.
 */
export function imageRatio(
  w?: number | null,
  h?: number | null,
  fallback = "16/10",
  min = 0.8,
  max = 2
): string {
  if (!w || !h) return fallback;
  const r = Math.min(max, Math.max(min, w / h));
  return `${Math.round(r * 1000)}/1000`;
}
