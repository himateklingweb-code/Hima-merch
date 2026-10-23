-- ============================================================================
-- 0012 — Izinkan SVG di bucket content-images.
--
-- Upload sekarang dikonversi ke WEBP di browser sebelum dikirim (lihat
-- src/lib/content-images.ts), kecuali SVG yang dibiarkan vektor asli. Bucket
-- perlu mengizinkan kedua tipe keluaran itu plus format masukan lama supaya
-- file yang sudah tersimpan sebelum perubahan ini tetap terbaca.
-- ============================================================================

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','image/svg+xml']
where id = 'content-images';
