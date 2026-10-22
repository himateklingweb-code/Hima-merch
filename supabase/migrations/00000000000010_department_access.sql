-- ============================================================================
-- 0010 — Akses panel per departemen.
--
-- Sebelumnya: peran panel tetap (admin / kwu / kominfo) dengan menu bawaan.
-- Sekarang:
--   * Peran hanya dua: 'admin' (semua menu) dan 'pengurus' (boleh masuk panel,
--     menunya mengikuti izin departemennya).
--   * Izin menu disimpan per departemen di tabel department_access, diatur
--     admin dari halaman Pengguna -> Izin departemen.
--   * Akun tanpa peran dan tanpa departemen = pengunjung (dihitung di UI).
--
-- Akun KWU/Kominfo lama tidak kehilangan akses: perannya jadi 'pengurus' dan
-- departemen KWU/Kominfo diberi izin yang sama dengan menu lamanya.
-- Idempoten: aman dijalankan ulang.
-- ============================================================================


-- 1. Izin menu per departemen ------------------------------------------------
create table if not exists public.department_access (
  department_id text not null references public.departments (id) on delete cascade,
  section       text not null check (section in
                  ('produk', 'pesanan', 'berita', 'departemen', 'mitra', 'iklan', 'seo')),
  primary key (department_id, section)
);

alter table public.department_access enable row level security;
drop policy if exists "signed in reads department access" on public.department_access;
create policy "signed in reads department access" on public.department_access
  for select to authenticated using (true);
revoke all on public.department_access from anon;
revoke insert, update, delete, truncate on public.department_access from authenticated;
grant select on public.department_access to authenticated;

-- Izin awal = menu lama KWU dan Kominfo, dicari lewat slug (id bisa beda).
insert into public.department_access (department_id, section)
select d.id, s.section
from public.departments d
join (values
  ('kwu', 'produk'), ('kwu', 'pesanan'), ('kwu', 'mitra'), ('kwu', 'iklan'),
  ('kominfo', 'berita'), ('kominfo', 'departemen'), ('kominfo', 'seo'),
  ('kominfo', 'mitra'), ('kominfo', 'iklan')
) as s(slug, section) on s.slug = d.slug
on conflict do nothing;


-- 2. Peran: admin + pengurus -------------------------------------------------
-- Departemen pengurus lama diisi dulu supaya izinnya tidak hilang.
insert into public.profiles (id, department_id, updated_at)
select s.id, d.id, now()
from public.staff s
join public.departments d on d.slug = s.role
where s.role in ('kwu', 'kominfo')
on conflict (id) do update
  set department_id = coalesce(public.profiles.department_id, excluded.department_id),
      updated_at = now();

alter table public.staff drop constraint if exists staff_role_check;
update public.staff set role = 'pengurus' where role not in ('admin', 'pengurus');
alter table public.staff
  add constraint staff_role_check check (role in ('admin', 'pengurus'));
alter table public.staff alter column role set default 'pengurus';


-- 3. Pemeriksa izin ----------------------------------------------------------
-- Admin selalu boleh. Pengurus boleh bila departemennya punya izin menu itu.
create or replace function public.has_section(p_section text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff s
    where s.id = auth.uid()
      and (
        s.role = 'admin'
        or exists (
          select 1
          from public.profiles p
          join public.department_access a on a.department_id = p.department_id
          where p.id = s.id and a.section = p_section
        )
      )
  );
$$;
revoke all on function public.has_section(text) from public, anon;
grant execute on function public.has_section(text) to authenticated;

-- Fungsi lama tetap ada untuk kompatibilitas; kini memetakan nama peran lama
-- ke izin departemen yang setara.
create or replace function public.has_staff_role(variadic p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.is_admin() and 'admin' = any (p_roles)
      or ('kwu' = any (p_roles) and public.has_section('pesanan'))
      or ('kominfo' = any (p_roles) and public.has_section('berita'));
$$;


-- 4. RLS mengikuti izin menu -------------------------------------------------
alter policy "staff insert products" on public.products
  with check (public.has_section('produk'));
alter policy "staff update products" on public.products
  using (public.has_section('produk')) with check (public.has_section('produk'));
alter policy "staff delete products" on public.products
  using (public.has_section('produk'));

alter policy "staff read orders" on public.orders
  using (public.has_section('pesanan'));
alter policy "staff update orders" on public.orders
  using (public.has_section('pesanan')) with check (public.has_section('pesanan'));
alter policy "staff read order items" on public.order_items
  using (public.has_section('pesanan'));

alter policy "staff writes articles" on public.articles
  with check (public.has_section('berita'));
alter policy "staff updates articles" on public.articles
  using (public.has_section('berita')) with check (public.has_section('berita'));
alter policy "staff deletes articles" on public.articles
  using (public.has_section('berita'));

alter policy "staff writes departments" on public.departments
  with check (public.has_section('departemen'));
alter policy "staff updates departments" on public.departments
  using (public.has_section('departemen')) with check (public.has_section('departemen'));
alter policy "staff deletes departments" on public.departments
  using (public.has_section('departemen'));

alter policy "staff writes periods" on public.department_periods
  with check (public.has_section('departemen'));
alter policy "staff updates periods" on public.department_periods
  using (public.has_section('departemen')) with check (public.has_section('departemen'));
alter policy "staff deletes periods" on public.department_periods
  using (public.has_section('departemen'));

alter policy "staff writes members" on public.department_members
  with check (public.has_section('departemen'));
alter policy "staff updates members" on public.department_members
  using (public.has_section('departemen')) with check (public.has_section('departemen'));
alter policy "staff deletes members" on public.department_members
  using (public.has_section('departemen'));

alter policy "staff writes site meta" on public.site_meta
  with check (public.has_section('seo'));
alter policy "staff updates site meta" on public.site_meta
  using (public.has_section('seo')) with check (public.has_section('seo'));

alter policy "staff writes partners" on public.partners
  with check (public.has_section('mitra'));
alter policy "staff updates partners" on public.partners
  using (public.has_section('mitra')) with check (public.has_section('mitra'));
alter policy "staff deletes partners" on public.partners
  using (public.has_section('mitra'));

alter policy "staff writes ads" on public.ads
  with check (public.has_section('iklan'));
alter policy "staff updates ads" on public.ads
  using (public.has_section('iklan')) with check (public.has_section('iklan'));
alter policy "staff deletes ads" on public.ads
  using (public.has_section('iklan'));

alter policy "staff read payment proof" on storage.objects
  using (bucket_id = 'payment-proofs' and public.has_section('pesanan'));
alter policy "staff delete payment proof" on storage.objects
  using (bucket_id = 'payment-proofs' and public.has_section('pesanan'));


-- 5. RPC yang memeriksa peran ------------------------------------------------
-- Badan fungsi diambil dari versi live; hanya baris pemeriksaan yang diganti.
do $$
declare v_def text;
begin
  select pg_get_functiondef('public.set_order_status(text, text, text)'::regprocedure) into v_def;
  v_def := replace(v_def, 'public.has_staff_role(''admin'', ''kwu'')', 'public.has_section(''pesanan'')');
  v_def := replace(v_def, 'Hanya Admin atau KWU yang boleh mengubah status pesanan.', 'Akunmu tidak punya izin menu Pesanan.');
  execute v_def;

  select pg_get_functiondef('public.set_content_seo(text, text, jsonb)'::regprocedure) into v_def;
  v_def := replace(v_def, 'public.has_staff_role(''admin'', ''kominfo'')', 'public.has_section(''seo'')');
  v_def := replace(v_def, 'Hanya Admin atau Kominfo yang boleh mengubah SEO.', 'Akunmu tidak punya izin menu SEO.');
  execute v_def;
end;
$$;

create or replace function public.add_staff_by_email(
  p_email text,
  p_full_name text default null,
  p_role text default 'pengurus'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_user auth.users%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menambah pengurus.' using errcode = '42501';
  end if;
  if p_role not in ('admin', 'pengurus') then
    raise exception 'Peran tidak valid.' using errcode = '22023';
  end if;

  select * into v_user from auth.users where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'Belum ada akun dengan email itu.' using errcode = '22023';
  end if;

  insert into public.staff (id, email, full_name, role)
  values (v_user.id, v_user.email,
          coalesce(nullif(trim(coalesce(p_full_name, '')), ''), v_user.email),
          p_role)
  on conflict (id) do update
    set full_name = excluded.full_name, role = excluded.role;

  return jsonb_build_object('ok', true, 'email', v_user.email);
end;
$$;

-- Atur akses panel (null = tanpa panel) dan departemen sekaligus.
create or replace function public.admin_set_user_access(
  p_user_id uuid,
  p_role text,
  p_department_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_email  text;
  v_cur    text;
  v_admins integer;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengatur akses.' using errcode = '42501';
  end if;

  select email into v_email from auth.users where id = p_user_id;
  if v_email is null then
    raise exception 'Pengguna tidak ditemukan.' using errcode = '22023';
  end if;
  if p_role is not null and p_role not in ('admin', 'pengurus') then
    raise exception 'Akses panel tidak valid.' using errcode = '22023';
  end if;
  if p_department_id is not null
     and not exists (select 1 from public.departments where id = p_department_id) then
    raise exception 'Departemen tidak ditemukan.' using errcode = '22023';
  end if;

  select role into v_cur from public.staff where id = p_user_id;
  if v_cur = 'admin' and coalesce(p_role, '') <> 'admin' then
    if p_user_id = auth.uid() then
      raise exception 'Tidak bisa menurunkan akses akun sendiri.' using errcode = '22023';
    end if;
    select count(*) into v_admins from public.staff where role = 'admin';
    if v_admins <= 1 then
      raise exception 'Ini satu-satunya admin. Angkat admin lain dulu.' using errcode = '22023';
    end if;
  end if;

  if p_role is null then
    delete from public.staff where id = p_user_id;
  else
    insert into public.staff (id, email, full_name, role)
    values (
      p_user_id, v_email,
      coalesce((select display_name from public.profiles where id = p_user_id), v_email),
      p_role
    )
    on conflict (id) do update set role = excluded.role;
  end if;

  insert into public.profiles (id, department_id, updated_at)
  values (p_user_id, p_department_id, now())
  on conflict (id) do update
    set department_id = excluded.department_id, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_set_user_access(uuid, text, text) from public, anon;
grant execute on function public.admin_set_user_access(uuid, text, text) to authenticated;

-- Simpan izin satu departemen (mengganti seluruh daftar).
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
  where x not in ('produk', 'pesanan', 'berita', 'departemen', 'mitra', 'iklan', 'seo')
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

-- Profil si pemanggil, kini dengan daftar menu yang boleh dibuka.
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
                       'iklan', 'seo', 'absensi', 'pengguna'])
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
