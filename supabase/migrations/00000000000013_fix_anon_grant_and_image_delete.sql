-- ============================================================================
-- 0013 — Perbaikan: anon tidak boleh EXECUTE has_section(), tapi 0011
--        menulis policy anon yang memanggilnya.
--
-- Bug:
--   Migrasi 0010 sengaja mencabut izin EXECUTE has_section() dari anon
--   ("revoke all ... from public, anon; grant execute ... to authenticated").
--   Tapi migrasi 0011 menulis policy SELECT untuk product_images,
--   product_attributes, product_variants, dan product_variant_options yang
--   menyasar "to anon, authenticated" dengan kondisi
--   "p.is_active or public.has_section('produk')".
--
--   Akibatnya setiap SELECT dari anon (pengunjung situs publik, termasuk
--   homepage dan /merchandise) gagal total dengan:
--     42501 permission denied for function has_section
--   bukan error RLS biasa — seluruh query produk gagal, dan kode
--   (getProducts() di content-repo.ts) diam-diam fallback ke data contoh
--   hardcode (src/data/products.ts: "Jaket Almamater TL", dst). Produk asli
--   di database (mis. "BAJU") tidak pernah tampil di situs publik maupun
--   di dashboard admin, walau tabel products sendiri terbaca normal
--   (policy-nya tidak memanggil has_section untuk anon).
--
-- Perbaikan:
--   has_section() aman diberi EXECUTE ke anon: body-nya memfilter
--   "s.id = auth.uid()", dan auth.uid() selalu null untuk anon (tidak
--   login) — exists(...) otomatis false, tidak ada kebocoran data staff.
--   Ini konsisten dengan cara is_staff() seharusnya dipakai (never granted
--   to anon) HANYA KARENA setiap policy is_staff() memang membatasi diri
--   ke "to authenticated" saja (lihat 00000000000000_init.sql baris 94-95);
--   has_section() di 0011 justru dipakai di policy yang menyasar anon
--   juga, jadi butuh grant yang berbeda.
--
-- Idempoten: aman dijalankan ulang.
-- ============================================================================

grant execute on function public.has_section(text) to anon;

-- ============================================================================
-- Fitur: hapus gambar artikel dari Storage saat artikel dihapus.
--
-- content-images sudah punya policy select/insert/update untuk staff
-- (00000000000007_content_images.sql), tapi belum ada policy DELETE sama
-- sekali — jadi storage.objects.remove() dari admin/berita/page.tsx akan
-- gagal diam-diam (ditolak RLS) tanpa policy ini.
-- ============================================================================

drop policy if exists "staff delete content images" on storage.objects;
create policy "staff delete content images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'content-images' and public.is_staff());
