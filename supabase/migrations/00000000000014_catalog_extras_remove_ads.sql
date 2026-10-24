-- ============================================================================
-- 0014 — Katalog merchandise & berita yang lebih lengkap, iklan dihapus.
--
-- Produk:
--   * category       — kategori produk (Kaos, Jaket, Aksesoris, …) untuk filter
--                      di etalase.
--   * compare_at_price — harga coret (sebelum diskon). Kosong = tanpa diskon.
--   * is_featured    — produk unggulan, tampil paling depan di beranda.
--   * order_index    — urutan manual di etalase (kecil = lebih dulu).
--   * weight_grams   — berat untuk perkiraan ongkir (opsional).
--   * size_chart     — teks/tabel panduan ukuran (opsional).
--   * max_per_order  — batas jumlah per pesanan (opsional).
--
-- Berita:
--   * is_published sudah ada → admin sekarang bisa menyimpan sebagai Draft.
--   * read_minutes   — perkiraan waktu baca, dihitung otomatis dari konten.
--
-- Iklan Mitra dihapus: tabel ads, izin 'iklan', dan pilihan menu di
-- daftar izin departemen. Mitra & sponsor sudah cukup diwakili tabel
-- partners.
--
-- Idempoten: aman dijalankan ulang.
-- ============================================================================


-- 1. Produk ------------------------------------------------------------------
alter table public.products
  add column if not exists category         text not null default '',
  add column if not exists compare_at_price integer check (compare_at_price is null or compare_at_price >= 0),
  add column if not exists is_featured      boolean not null default false,
  add column if not exists order_index      integer not null default 0,
  add column if not exists weight_grams     integer check (weight_grams is null or weight_grams >= 0),
  add column if not exists size_chart       text not null default '',
  add column if not exists max_per_order    integer check (max_per_order is null or max_per_order > 0);

create index if not exists products_catalog_idx
  on public.products (is_active, is_featured desc, order_index, created_at);


-- 2. Berita ------------------------------------------------------------------
alter table public.articles
  add column if not exists read_minutes integer check (read_minutes is null or read_minutes > 0);


-- 3. Hapus fitur Iklan Mitra -------------------------------------------------
delete from public.department_access where section = 'iklan';

alter table public.department_access
  drop constraint if exists department_access_section_check;
alter table public.department_access
  add constraint department_access_section_check
  check (section in ('produk', 'pesanan', 'berita', 'departemen', 'mitra', 'seo'));

create or replace function public.admin_set_department_access(
  p_department_id text,
  p_sections text[]
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_bad text;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengatur izin departemen.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.departments where id = p_department_id) then
    raise exception 'Departemen tidak ditemukan.' using errcode = '22023';
  end if;
  select x into v_bad
  from unnest(coalesce(p_sections, '{}')) as x
  where x not in ('produk', 'pesanan', 'berita', 'departemen', 'mitra', 'seo')
  limit 1;
  if v_bad is not null then
    raise exception 'Menu tidak dikenal: %', v_bad using errcode = '22023';
  end if;

  delete from public.department_access where department_id = p_department_id;
  insert into public.department_access (department_id, section)
  select distinct p_department_id, x from unnest(coalesce(p_sections, '{}')) as x;

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_set_department_access(text, text[]) from public, anon;
grant execute on function public.admin_set_department_access(text, text[]) to authenticated;

-- Profil si pemanggil — sama seperti 0010, tanpa menu 'iklan'.
create or replace function public.get_my_profile()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', u.id,
    'display_name', p.display_name,
    'department_id', p.department_id,
    'department_name', d.name,
    'department_slug', d.slug,
    'staff_role', s.role,
    'sections', case
      when s.role = 'admin' then
        to_jsonb(array['produk', 'pesanan', 'berita', 'departemen', 'mitra',
                       'seo', 'absensi', 'pengguna'])
      when s.role is not null then
        coalesce((select jsonb_agg(a.section order by a.section)
                  from public.department_access a
                  where a.department_id = p.department_id), '[]'::jsonb)
      else '[]'::jsonb
    end
  )
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.departments d on d.id = p.department_id
  left join public.staff s on s.id = u.id
  where u.id = auth.uid();
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

drop table if exists public.ads cascade;
