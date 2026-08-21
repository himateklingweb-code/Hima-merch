# Setup & Deployment — Website HIMA TL UNTAN

Panduan lengkap dari nol sampai website tayang. Ikuti berurutan.

Perkiraan waktu: **30–45 menit**, sebagian besar menunggu deploy.

---

## Daftar isi

1. [Yang perlu disiapkan](#1-yang-perlu-disiapkan)
2. [Menjalankan di komputer sendiri](#2-menjalankan-di-komputer-sendiri)
3. [Menyiapkan database Supabase](#3-menyiapkan-database-supabase)
4. [Membuat akun pengurus](#4-membuat-akun-pengurus-dashboard)
5. [Ganti nomor WhatsApp kasir](#5-ganti-nomor-whatsapp-kasir)
6. [Deploy ke Vercel](#6-deploy-ke-vercel)
7. [Setelah tayang](#7-setelah-tayang)
8. [Cara kerja pemesanan](#8-cara-kerja-pemesanan)
9. [Tugas rutin pengurus](#9-tugas-rutin-pengurus)
10. [Kalau ada masalah](#10-kalau-ada-masalah)
11. [Status & catatan](#11-yang-belum-selesai)

---

## 1. Yang perlu disiapkan

| Kebutuhan | Keterangan |
|---|---|
| Node.js 20+ | <https://nodejs.org> — pilih versi LTS |
| Akun Supabase | <https://supabase.com> — gratis |
| Akun Vercel | <https://vercel.com> — gratis, login pakai GitHub |
| Akses repo GitHub | `himateklingweb-code/Hima-merch` |
| Nomor WhatsApp kasir | Nomor aktif yang menerima pesanan |

---

## 2. Menjalankan di komputer sendiri

```bash
git clone https://github.com/himateklingweb-code/Hima-merch.git
```

```bash
cd Hima-merch && npm install
```

Buat file `.env.local` di folder utama. Salin dari contoh:

```bash
cp .env.local.example .env.local
```

Isi nilainya (cara mendapatkannya ada di [bagian 3](#3-menyiapkan-database-supabase)):

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_xxxxx
NEXT_PUBLIC_WA_KASIR=628xxxxxxxxxx
```

Jalankan:

```bash
npm run dev
```

Buka <http://localhost:3000>.

> **Tanpa `.env.local` pun website tetap jalan** — hanya saja pesanan tidak
> tersimpan dan dashboard menampilkan data contoh. Ini disengaja supaya
> website tidak pernah rusak total hanya karena konfigurasi belum diisi.

---

## 3. Menyiapkan database Supabase

### 3a. Buat project

1. Masuk ke <https://supabase.com/dashboard>
2. **New project** → beri nama, pilih region **Southeast Asia (Singapore)**
   (paling dekat dengan Indonesia, jadi paling cepat)
3. Simpan **Database Password** di tempat aman — tidak dipakai website,
   tapi perlu kalau suatu saat mau akses langsung

### 3b. Jalankan skema database

Buka menu **SQL Editor** → **New query**, lalu jalankan **lima file ini
secara berurutan** (isi seluruhnya, satu per satu):

| Urutan | File | Isi |
|---|---|---|
| 1 | [`00000000000000_init.sql`](supabase/migrations/00000000000000_init.sql) | `staff`, `products`, `orders`, `order_items`, RLS, fungsi pemesanan |
| 2 | [`00000000000001_content_tables.sql`](supabase/migrations/00000000000001_content_tables.sql) | `articles`, `departments`, `department_periods`, `department_members`, `partners`, `ads` + RLS |
| 3 | [`00000000000002_seed_content.sql`](supabase/migrations/00000000000002_seed_content.sql) | Isi awal berita, departemen, mitra, iklan |
| 4 | [`00000000000003_lifecycle_and_extras.sql`](supabase/migrations/00000000000003_lifecycle_and_extras.sql) | Verifikasi pesanan, kedaluwarsa otomatis, batas per-IP, `site_meta`, bukti pembayaran |
| 5 | [`00000000000004_staff_self_service.sql`](supabase/migrations/00000000000004_staff_self_service.sql) | Kelola pengurus dari dashboard, akun pertama otomatis admin |
| 6 | [`00000000000005_customer_accounts.sql`](supabase/migrations/00000000000005_customer_accounts.sql) | Akun pembeli — pesanan terikat ke akun, login wajib untuk memesan, halaman `/akun` |

Semuanya aman dijalankan ulang — memakai `if not exists` dan
`on conflict do nothing`.

### 3c. Ambil kunci API

**Project Settings** → **API Keys**:

| Yang disalin | Ditempel ke |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| **Publishable** key (`sb_publishable_…`) | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

> ⚠️ **Jangan pernah memakai `service_role` key.** Kunci itu melewati semua
> aturan keamanan. Apa pun yang berawalan `NEXT_PUBLIC_` ikut terkirim ke
> browser pengunjung — cukup pakai publishable key, keamanannya dijaga oleh
> RLS di database.

### 3d. Nyalakan login pembeli (Google + email)

Sejak migration ke-6, **memesan wajib login** — pembeli masuk dengan akun
Google atau akun email, dan setiap pesanan otomatis terikat ke akunnya lalu
muncul di halaman **`/akun`** miliknya. Dua penyetelan di dashboard Supabase:

**a. Alamat redirect** — **Authentication → URL Configuration**:

| Kolom | Isi |
|---|---|
| **Site URL** | `https://hima.tekniklingkungan.com` (produksi). Saat mengembangkan di lokal boleh `http://localhost:3000` |
| **Redirect URLs** (Add URL) | `https://hima.tekniklingkungan.com/auth/callback` **dan** `http://localhost:3000/auth/callback` |

Tanpa ini, login Google akan ditolak dengan "redirect_uri mismatch". Tambahkan
alamat lokal **dan** produksi supaya keduanya bisa dipakai.

**b. Google** — **Authentication → Sign In / Providers → Google** harus
**Enabled** (Client ID & Secret dari Google Cloud Console; di project ini
sudah menyala). Pastikan `https://<project>.supabase.co/auth/v1/callback`
terdaftar sebagai *Authorized redirect URI* di Google Cloud.

Untuk project ini, di **Google Cloud Console → OAuth client → Authorized
redirect URIs** harus ada:

```
https://qpdpfmjgahcddkqebsnk.supabase.co/auth/v1/callback
```

Biasanya sudah ada (itu syarat provider bisa "Enabled"). Kalau login Google
memunculkan `redirect_uri_mismatch`, baris inilah yang perlu dicek.

**c. Konfirmasi email (opsional)** — **Authentication → Sign In / Providers →
Email → Confirm email**:

- **Aktif** (default): pendaftar akun email harus klik tautan konfirmasi
  dulu; halaman masuk menampilkan "Cek email kamu". Paling aman.
- **Nonaktif**: akun langsung bisa dipakai tanpa verifikasi. Lebih mulus,
  tapi email tidak terbukti benar.

Login Google tidak terpengaruh penyetelan ini — akun Google selalu langsung aktif.

---

## 4. Membuat akun pengurus (dashboard)

Dashboard `/admin` hanya bisa diakses akun yang **(a)** terdaftar di Supabase
Auth **dan (b)** punya baris di tabel `staff`. Dua-duanya wajib — masuk
membuktikan *siapa kamu*, baris `staff` menentukan *apa yang boleh dilihat*.

> **Akun pertama otomatis jadi admin.** Di database yang masih kosong, user
> pertama yang dibuat langsung didaftarkan sebagai admin. Jadi untuk akun
> pertama cukup langkah 4a — tidak perlu SQL sama sekali.

### 4a. Buat user

**Authentication** → **Users** → **Add user** → **Create new user**

- Email: misal `kasir@himatl.com`
- Password: buat yang kuat (pakai password manager)
- Centang **Auto Confirm User** (supaya tidak perlu verifikasi email)

Hanya Supabase yang bisa menetapkan password — password disimpan sebagai
hash bcrypt dan tidak pernah bisa diisi lewat SQL.

### 4b. Beri akses — lewat dashboard, bukan SQL

Buka **`/admin/pengguna`**. Akun yang sudah dibuat tapi belum punya akses
muncul di bagian **"Menunggu akses"**. Klik **Jadikan kasir** atau
**atau admin**. Selesai.

Di halaman yang sama kamu juga bisa menaikkan/menurunkan peran dan mencabut
akses. Semua tanpa menyentuh SQL Editor.

> Halaman ini hanya bisa dipakai **admin**. Kasir melihat daftar pengurus
> tapi tidak bisa mengubahnya.
>
> Admin terakhir tidak bisa menghapus dirinya sendiri atau dihapus — supaya
> dashboard tidak pernah terkunci tanpa admin.

### 4b (cara lama, kalau perlu)

Masih bisa lewat SQL Editor kalau memang lebih suka:

**SQL Editor** → jalankan (ganti emailnya agar cocok dengan 4a):

```sql
insert into public.staff (id, email, full_name, role)
select id, email, 'Nama Lengkap', 'admin'
from auth.users
where email = 'kasir@himatl.com'
on conflict (id) do nothing;
```

Perintah ini tidak berisi password — password sudah dibuat di 4a. Yang
dilakukan hanya mencari user berdasarkan email lalu menyalin `id`-nya ke
`staff`. Kalau hasilnya `0 rows`, emailnya tidak cocok dengan 4a.

`role` boleh `admin` atau `kasir`.

### Lupa atau ganti password

**Authentication** → **Users** → klik user → **Reset password**. Tidak perlu
menyentuh tabel `staff`.

Coba masuk lewat `/admin/login`.

> **Lupa langkah 4b?** Login akan ditolak dengan pesan "Akun ini belum
> terdaftar sebagai pengurus" — itu memang perilaku yang benar, bukan bug.

### Menghapus akses pengurus

Lewat **`/admin/pengguna`** → ikon 🗑 di baris orangnya.

Setelah dicabut, akunnya masih bisa masuk tapi tidak melihat apa pun. Untuk
menutup total, hapus juga usernya di **Authentication → Users**.

---

## 5. Ganti nomor WhatsApp kasir

Di `.env.local` (dan nanti di Vercel):

```
NEXT_PUBLIC_WA_KASIR=6281234567890
```

Aturan penulisan: **angka saja**, diawali kode negara, tanpa `+`, spasi,
atau tanda hubung. Nomor `0813-5555-6666` ditulis `6281355556666`.

---

## 6. Deploy ke Vercel

1. <https://vercel.com/new> → **Import** repo `Hima-merch`
2. Framework otomatis terdeteksi sebagai **Next.js** — biarkan
3. Buka **Environment Variables**, isi ketiganya:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project URL dari Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key |
   | `NEXT_PUBLIC_WA_KASIR` | Nomor WhatsApp kasir |

4. **Deploy**

Setiap `git push` ke `master` akan otomatis deploy ulang.

### Domain sendiri

**Settings** → **Domains** → tambahkan `hima.tekniklingkungan.com`, lalu
ikuti instruksi DNS dari Vercel.

Setelah domain aktif, ubah `SITE_URL` di
[`src/data/seo.ts`](src/data/seo.ts) supaya sitemap dan metadata memakai
alamat yang benar. **Lalu tambahkan `https://hima.tekniklingkungan.com/auth/callback`
ke Redirect URLs Supabase** ([bagian 3d](#3d-nyalakan-login-pembeli-google--email)),
kalau belum — tanpa itu login Google gagal di produksi.

---

## 7. Setelah tayang

Cek satu per satu:

- [ ] Beranda terbuka, gambar muncul
- [ ] `/merchandise` menampilkan produk
- [ ] Tambah ke keranjang → checkout **menuntut login dulu** (Google/email)
- [ ] Login Google berhasil dan kembali ke situs (Redirect URLs sudah diisi)
- [ ] Setelah login: checkout → WhatsApp terbuka berisi ringkasan
- [ ] Kode pesanan muncul di layar setelah checkout
- [ ] Pesanan muncul di `/akun` milik pembeli
- [ ] Email pembeli muncul di baris pesanan pada `/admin/pesanan`
- [ ] Kode itu bisa dicari di `/pesanan/cek`
- [ ] Pesanan muncul di `/admin/pesanan` dengan label **Data live**
- [ ] `/admin` menolak akses tanpa login
- [ ] Buka di HP — tata letak rapi
- [ ] Klik **Verifikasi** di sebuah pesanan → stok produk berkurang
- [ ] Unggah bukti transfer dari halaman lacak pesanan → ikon 🧾 muncul di dashboard
- [ ] Ubah judul di `/admin/seo` → **Simpan** → muat ulang halamannya, judul tab ikut berubah

---

## 8. Cara kerja pemesanan

```
Mahasiswa                    Website                  Database
   |                            |                        |
   |-- pilih produk ----------->|                        |
   |                       keranjang                     |
   |                    (tersimpan di HP)                |
   |-- masuk (Google/email) --->|   login wajib          |
   |-- isi data & checkout ---->|                        |
   |                            |-- create_order() ----->|
   |                            |                   cek login
   |                            |                   cek harga
   |                            |                   cek stok
   |                            |                   kunci stok
   |                            |               ikat ke akun
   |                            |<-- kode pesanan -------|
   |<-- WhatsApp kasir ---------|                        |
   |                                                     |
Pembeli lihat pesanannya di /akun · Kasir ubah status di /admin/pesanan
```

**Kenapa harus login?** Supaya setiap pesanan terikat ke akun pembeli: dia
bisa melacak semua pesanannya di `/akun`, dan kasir tahu akun mana yang
memesan (email pembeli muncul di `/admin/pesanan`). Login diwajibkan di
database, bukan hanya di tampilan — `create_order()` menolak permintaan tanpa
akun.

**Kenapa harga tidak dikirim dari browser?** Karena browser bisa dimanipulasi.
Yang dikirim hanya *produk apa* dan *berapa banyak*; harga dibaca database
dari katalog. Jadi kalaupun ada yang mengubah data di browser, harga yang
tercatat tetap harga asli.

Hal yang sama berlaku untuk stok: kalau barang habis saat mahasiswa sedang
mengisi formulir, pesanan ditolak dengan pesan jelas dan **keranjang tidak
dikosongkan** — jadi tidak ada pesanan hantu yang terlanjur dikirim ke kasir.

---

## 9. Tugas rutin pengurus

Semua konten di bawah ini diubah lewat dashboard `/admin` dan langsung
tersimpan ke database. Website menyegarkan diri paling lama **1 menit**
setelah perubahan — tidak perlu deploy ulang.

| Yang diubah | Di mana |
|---|---|
| Berita / artikel | `/admin/berita` |
| Pengurus departemen | `/admin/departemen` |
| Iklan mitra di beranda | `/admin/iklan` |
| Meta SEO produk & berita | `/admin/seo` |
| Stok & harga produk | Supabase **Table Editor** → `products` |

Setiap layar menampilkan lencana **Data live** kalau tersambung ke database.
Kalau tertulis **Data contoh**, perubahan tidak akan tersimpan — periksa
konfigurasi env.

### Mengubah stok / harga produk

**Table Editor** → tabel `products` → edit langsung.

| Kolom | Arti |
|---|---|
| `price` | Harga dalam rupiah, tanpa titik (`85000`) |
| `stock` | Jumlah barang fisik |
| `stock_reserved` | Terkunci oleh pesanan yang belum diverifikasi |
| `po_quota` / `po_filled` | Kuota dan jumlah terisi untuk pre-order |
| `po_deadline` | Tanggal tutup PO — lewat tanggal ini, PO otomatis ditolak |
| `is_active` | `false` menyembunyikan produk dari pemesanan |

> Etalase membaca tabel ini langsung, jadi stok yang dilihat pengunjung
> selalu sesuai kenyataan — termasuk stok yang sedang ditahan pesanan
> yang belum diverifikasi.

### Memverifikasi pesanan

Buka `/admin/pesanan`. Tiap pesanan yang menunggu punya tombol:

| Tombol | Yang terjadi |
|---|---|
| **Verifikasi** | Pesanan jadi *terjual* & *lunas*. Stok benar-benar berkurang |
| **✕ (Batalkan)** | Pesanan dibatalkan, stok yang ditahan dikembalikan |
| **Urungkan** | Membatalkan verifikasi, stok kembali ditahan |

Ikon 🧾 muncul kalau pembeli sudah mengunggah bukti transfer — klik untuk
membukanya. Tautannya hanya berlaku 5 menit dan hanya bisa dibuka pengurus.

> Stok bergerak sendiri mengikuti status. Jangan menguranginya manual di
> Table Editor, nanti terhitung dua kali.

### Pesanan kedaluwarsa

Berjalan otomatis: tiap jam, pesanan yang belum dibayar lebih dari 24 jam
ditandai *kadaluarsa* dan stoknya dilepas kembali.

Untuk menjalankan lebih awal, atau memakai batas waktu lain:

```sql
select public.expire_stale_orders(24);
```

---

## 10. Kalau ada masalah

| Gejala | Penyebab & solusi |
|---|---|
| Dashboard bertuliskan **"Data contoh"** | Env belum terisi. Cek `.env.local` (lokal) atau Environment Variables di Vercel, lalu deploy ulang |
| Login ditolak terus | Belum ada baris di tabel `staff` — lihat [4b](#4b-daftarkan-sebagai-pengurus) |
| Pesanan tersimpan tapi dashboard kosong | Sudah login? RLS memang mengembalikan kosong untuk yang bukan pengurus |
| "Stok tidak mencukupi" padahal ada | `stock_reserved` menumpuk dari pesanan lama. Bersihkan seperti di [bagian 9](#pesanan-kedaluwarsa) |
| WhatsApp tidak terbuka | Pemblokir popup. Tombol "Buka WhatsApp kasir" di layar konfirmasi tetap bisa diklik |
| Perubahan env tidak terasa | Nilai `NEXT_PUBLIC_` menempel saat build — wajib deploy ulang |

---

## 11. Yang belum selesai

Jujur soal batasan saat ini, supaya tidak ada kejutan:

Semua yang dulu tercatat di sini sudah selesai:

| Hal | Status |
|---|---|
| Ubah status pesanan | ✅ Tombol **Verifikasi**, **Batalkan**, dan **Urungkan** berfungsi. Stok ikut bergerak otomatis |
| Meta halaman statis | ✅ Tersimpan di tabel `site_meta`, diedit lewat `/admin/seo` |
| Pesanan kedaluwarsa | ✅ Otomatis tiap jam — pesanan belum bayar lewat 24 jam jadi kadaluarsa dan stoknya dilepas |
| Pembatasan pesanan | ✅ 5 per nomor **dan** 15 per jaringan, per jam |
| Bukti pembayaran | ✅ Pembeli mengunggah dari halaman lacak pesanan; hanya kasir yang bisa membukanya |
| Akun pembeli & login | ✅ Login Google/email wajib untuk memesan; pesanan terikat ke akun dan muncul di `/akun`; email pembeli terlihat di `/admin/pesanan` |

### Yang masih perlu perhatian

| Hal | Keterangan |
|---|---|
| **Leaked password protection** | Belum aktif, dan **butuh paket Pro** — project ini masih Free, jadi belum bisa dinyalakan. Kalau nanti naik paket: **Authentication** → **Sign In / Providers** → **Email**. Sementara itu, atur panjang minimum & syarat karakter di halaman yang sama (gratis), dan pakai password manager saat membuat akun pengurus |
| **Keywords global di `/admin/seo`** | Masih per sesi — belum dipakai di metadata mana pun |
| **Tombol "Generate sitemap"** | Kosmetik. Sitemap sudah otomatis di `/sitemap.xml`, dibangun ulang tiap deploy |

Semua konten — produk, pesanan, berita, departemen, pengurus, mitra, iklan,
dan meta halaman — berjalan penuh di database dan bisa diubah lewat
dashboard.

Prioritas berikutnya ada di [`SECURITY-TODO.md`](SECURITY-TODO.md).

---

## Ringkasan perintah

```bash
npm run dev
```

```bash
npm run build
```

```bash
npx tsc --noEmit
```
