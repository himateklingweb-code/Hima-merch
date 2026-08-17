# Website HIMA Teknik Lingkungan UNTAN

Situs resmi Himpunan Mahasiswa Teknik Lingkungan, Universitas Tanjungpura —
profil organisasi, berita kegiatan, struktur kepengurusan, dan etalase
merchandise dengan pemesanan lewat WhatsApp.

**Mau memasang atau men-deploy? → [SETUP.md](SETUP.md)**

---

## Teknologi

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Bahasa | TypeScript |
| Styling | Tailwind CSS v4 + CSS variables |
| Database | Supabase (PostgreSQL 17 + Auth + RLS) |
| Deploy | Vercel |

---

## Struktur

```
All content — products, orders, berita, departemen, mitra and iklan — lives
in Postgres. The `src/data/*.ts` collections remain only as a fallback so a
fresh clone runs without any configuration.

```
src/
├─ app/
│  ├─ page.tsx              Beranda
│  ├─ tentang/              Profil, visi & misi
│  ├─ departemen/           Struktur kepengurusan
│  ├─ berita/               Artikel kegiatan
│  ├─ merchandise/          Etalase produk
│  ├─ keranjang/            Keranjang + checkout
│  ├─ pesanan/cek/          Lacak pesanan
│  ├─ kemitraan/, kontak/
│  └─ admin/                Dashboard pengurus
├─ components/              Navbar, Footer, Carousel, Cart, Loader
├─ data/                    Konten statis (berita, departemen, mitra)
└─ lib/                     Klien Supabase & akses data pesanan

supabase/migrations/        Skema database
```

---

## Cara kerja pemesanan

Keranjang disimpan di browser. Saat checkout, browser hanya mengirim
**produk apa dan berapa banyak** — harga, stok, dan kuota pre-order dibaca
langsung dari katalog oleh database lewat fungsi `create_order()`. Artinya
data yang dimanipulasi di browser tidak bisa mengubah harga atau memesan
melebihi stok.

Kode pesanan dikembalikan ke pembeli, ringkasan dikirim ke WhatsApp kasir,
dan pesanan muncul di dashboard.

Pembeli bisa melacak pesanan di `/pesanan/cek`. Halaman itu memanggil
`get_order_by_code()`, yang menyamarkan nama dan nomor serta tidak
mengembalikan alamat — supaya kode yang bocor tidak berubah jadi data
kontak orang.

---

## Keamanan

- **Row Level Security** aktif di semua tabel. Tabel `orders` tidak bisa
  dibaca publik sama sekali; hanya pengurus yang sudah login (punya baris di
  tabel `staff`) yang bisa melihatnya.
- **Harga divalidasi di server.** Browser tidak pernah menentukan harga.
- **Kode pesanan tidak bisa ditebak** — ada akhiran acak, jadi tidak bisa
  ditelusuri berurutan.
- **Dashboard pakai Supabase Auth.** Tidak ada kredensial demo.
- **Content Security Policy** membatasi koneksi keluar hanya ke Supabase.

Catatan lengkap dan sisa pekerjaan: [SECURITY-TODO.md](SECURITY-TODO.md).

---

## Pengembangan

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

Website tetap berjalan tanpa `.env.local` — pesanan tidak tersimpan dan
dashboard memakai data contoh. Ini disengaja agar konfigurasi yang belum
lengkap tidak membuat situs mati.

---

## Lisensi & kredit

Dikembangkan untuk HIMA Teknik Lingkungan UNTAN.
Dirancang oleh [sayba.arc](https://sayba.id).
