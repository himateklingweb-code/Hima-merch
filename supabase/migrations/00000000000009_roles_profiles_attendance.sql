-- ============================================================================
-- 0009 — Peran panel (Admin / KWU / Kominfo), profil + nama tampilan,
--        anggota per departemen, dan absensi QR + radius lokasi.
--
-- Idempoten: aman dijalankan ulang. Jalankan utuh di SQL Editor Supabase.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. Peran panel admin: hanya admin, kwu, kominfo. "kasir" dilebur ke "kwu"
--    (KWU memegang merchandise & pesanan, tugas kasir sebelumnya).
-- ---------------------------------------------------------------------------
alter table public.staff drop constraint if exists staff_role_check;
update public.staff set role = 'kwu' where role = 'kasir';
alter table public.staff
  add constraint staff_role_check check (role in ('admin', 'kwu', 'kominfo'));
alter table public.staff alter column role set default 'kwu';

-- Pemeriksa peran untuk RLS. SECURITY DEFINER supaya tidak terhalang RLS
-- tabel staff sendiri, dan hanya melaporkan peran si pemanggil.
create or replace function public.has_staff_role(variadic p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.staff
    where id = auth.uid() and role = any (p_roles)
  );
$$;
revoke all on function public.has_staff_role(text[]) from public, anon;
grant execute on function public.has_staff_role(text[]) to authenticated;


-- ---------------------------------------------------------------------------
-- 2. RLS per peran. Mitra & iklan tetap untuk semua pengurus panel.
--    Produk, pesanan, bukti bayar  -> admin + kwu
--    Berita, departemen, SEO halaman -> admin + kominfo
-- ---------------------------------------------------------------------------
alter policy "staff insert products" on public.products
  with check (public.has_staff_role('admin', 'kwu'));
alter policy "staff update products" on public.products
  using (public.has_staff_role('admin', 'kwu'))
  with check (public.has_staff_role('admin', 'kwu'));
alter policy "staff delete products" on public.products
  using (public.has_staff_role('admin', 'kwu'));

alter policy "staff read orders" on public.orders
  using (public.has_staff_role('admin', 'kwu'));
alter policy "staff update orders" on public.orders
  using (public.has_staff_role('admin', 'kwu'))
  with check (public.has_staff_role('admin', 'kwu'));
alter policy "staff read order items" on public.order_items
  using (public.has_staff_role('admin', 'kwu'));

alter policy "staff writes articles" on public.articles
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff updates articles" on public.articles
  using (public.has_staff_role('admin', 'kominfo'))
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff deletes articles" on public.articles
  using (public.has_staff_role('admin', 'kominfo'));

alter policy "staff writes departments" on public.departments
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff updates departments" on public.departments
  using (public.has_staff_role('admin', 'kominfo'))
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff deletes departments" on public.departments
  using (public.has_staff_role('admin', 'kominfo'));

alter policy "staff writes periods" on public.department_periods
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff updates periods" on public.department_periods
  using (public.has_staff_role('admin', 'kominfo'))
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff deletes periods" on public.department_periods
  using (public.has_staff_role('admin', 'kominfo'));

alter policy "staff writes members" on public.department_members
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff updates members" on public.department_members
  using (public.has_staff_role('admin', 'kominfo'))
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff deletes members" on public.department_members
  using (public.has_staff_role('admin', 'kominfo'));

alter policy "staff writes site meta" on public.site_meta
  with check (public.has_staff_role('admin', 'kominfo'));
alter policy "staff updates site meta" on public.site_meta
  using (public.has_staff_role('admin', 'kominfo'))
  with check (public.has_staff_role('admin', 'kominfo'));

alter policy "staff read payment proof" on storage.objects
  using (bucket_id = 'payment-proofs' and public.has_staff_role('admin', 'kwu'));
alter policy "staff delete payment proof" on storage.objects
  using (bucket_id = 'payment-proofs' and public.has_staff_role('admin', 'kwu'));


-- ---------------------------------------------------------------------------
-- 3. Perbaikan keamanan fungsi lama.
--    expire_stale_orders() bisa dipanggil SEMUA user login, jadi siapa pun
--    bisa memanggil expire_stale_orders(0) dan membatalkan semua pesanan
--    pending. Cukup pg_cron (berjalan sebagai postgres) yang memanggilnya.
-- ---------------------------------------------------------------------------
revoke all on function public.expire_stale_orders(integer) from public, anon, authenticated;
revoke all on function public.bootstrap_first_staff() from public, anon, authenticated;

-- Peran baru di RPC lama (dipertahankan agar klien lama tidak patah).
create or replace function public.add_staff_by_email(
  p_email text,
  p_full_name text default null,
  p_role text default 'kwu'
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
  if p_role not in ('admin', 'kwu', 'kominfo') then
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
revoke all on function public.add_staff_by_email(text, text, text) from public, anon;
grant execute on function public.add_staff_by_email(text, text, text) to authenticated;


-- ---------------------------------------------------------------------------
-- 4. Profil: nama tampilan bebas (bukan email) + departemen anggota.
--    Tulis hanya lewat RPC di bawah, jadi user tidak bisa memindahkan
--    dirinya sendiri ke departemen lain.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (display_name is null or char_length(display_name) between 2 and 60),
  department_id text references public.departments (id) on delete set null,
  updated_at    timestamptz not null default now()
);
create index if not exists profiles_department_idx on public.profiles (department_id);

alter table public.profiles enable row level security;
drop policy if exists "own profile or admin reads" on public.profiles;
create policy "own profile or admin reads" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

revoke all on public.profiles from anon;
revoke insert, update, delete, truncate on public.profiles from authenticated;
grant select on public.profiles to authenticated;

-- Isi profil untuk akun yang sudah ada. Nama staf yang berupa email dilewati.
insert into public.profiles (id, display_name)
select u.id,
       case
         when char_length(n.nm) between 2 and 60 then n.nm
         else null
       end
from auth.users u
left join public.staff s on s.id = u.id
cross join lateral (
  select left(trim(coalesce(
    nullif(u.raw_user_meta_data ->> 'full_name', ''),
    nullif(u.raw_user_meta_data ->> 'name', ''),
    case when s.full_name is not null and s.full_name !~ '@' then s.full_name end,
    ''
  )), 60) as nm
) n
on conflict (id) do nothing;

-- Profil otomatis untuk akun baru. Nama < 2 huruf dijadikan null supaya
-- check constraint tidak pernah menggagalkan pendaftaran.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_name text;
begin
  v_name := left(trim(coalesce(
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    nullif(new.raw_user_meta_data ->> 'name', ''),
    ''
  )), 60);
  if char_length(v_name) < 2 then
    v_name := null;
  end if;

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function public.handle_new_user_profile() from public, anon, authenticated;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Profil si pemanggil: nama, departemen, peran panel.
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
    'staff_role', s.role
  )
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.departments d on d.id = p.department_id
  left join public.staff s on s.id = u.id
  where u.id = auth.uid();
$$;
revoke all on function public.get_my_profile() from public, anon;
grant execute on function public.get_my_profile() to authenticated;

-- Ubah nama tampilan: diri sendiri, atau siapa pun bila pemanggil admin.
create or replace function public.set_display_name(
  p_name text,
  p_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target uuid := coalesce(p_user_id, auth.uid());
  v_name   text;
begin
  if auth.uid() is null then
    raise exception 'Silakan masuk dulu.' using errcode = '42501';
  end if;
  if v_target <> auth.uid() and not public.is_admin() then
    raise exception 'Hanya admin yang boleh mengubah nama pengguna lain.' using errcode = '42501';
  end if;

  v_name := regexp_replace(coalesce(p_name, ''), '[[:cntrl:]]', '', 'g');
  v_name := regexp_replace(trim(v_name), '\s+', ' ', 'g');
  if char_length(v_name) < 2 or char_length(v_name) > 60 then
    raise exception 'Nama harus 2–60 karakter.' using errcode = '22023';
  end if;
  if not exists (select 1 from auth.users where id = v_target) then
    raise exception 'Pengguna tidak ditemukan.' using errcode = '22023';
  end if;

  insert into public.profiles (id, display_name, updated_at)
  values (v_target, v_name, now())
  on conflict (id) do update
    set display_name = excluded.display_name, updated_at = now();

  -- Nama di daftar pengurus ikut berubah supaya tidak tampil email lagi.
  update public.staff set full_name = v_name where id = v_target;

  return jsonb_build_object('ok', true, 'display_name', v_name);
end;
$$;
revoke all on function public.set_display_name(text, uuid) from public, anon;
grant execute on function public.set_display_name(text, uuid) to authenticated;

-- Semua akun untuk halaman Pengguna (admin saja).
create or replace function public.admin_list_users()
returns table (
  id uuid,
  email text,
  display_name text,
  department_id text,
  staff_role text,
  created_at timestamptz,
  last_sign_in_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh melihat daftar akun.' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, p.display_name, p.department_id, s.role,
           u.created_at, u.last_sign_in_at
    from auth.users u
    left join public.profiles p on p.id = u.id
    left join public.staff s on s.id = u.id
    order by u.created_at desc;
end;
$$;
revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- Atur akses panel (null = tanpa akses) dan departemen anggota sekaligus.
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
  if p_role is not null and p_role not in ('admin', 'kwu', 'kominfo') then
    raise exception 'Peran tidak valid.' using errcode = '22023';
  end if;
  if p_department_id is not null
     and not exists (select 1 from public.departments where id = p_department_id) then
    raise exception 'Departemen tidak ditemukan.' using errcode = '22023';
  end if;

  select role into v_cur from public.staff where id = p_user_id;
  if v_cur = 'admin' and coalesce(p_role, '') <> 'admin' then
    if p_user_id = auth.uid() then
      raise exception 'Tidak bisa menurunkan peran akun sendiri.' using errcode = '22023';
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


-- ---------------------------------------------------------------------------
-- 5. Status pesanan: admin + kwu, dan nama verifikator dari nama tampilan.
-- ---------------------------------------------------------------------------
create or replace function public.set_order_status(
  p_order_code text,
  p_order_status text default null,
  p_payment_status text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order   public.orders%rowtype;
  v_new_ord text;
  v_new_pay text;
  v_actor   text;
begin
  if not public.has_staff_role('admin', 'kwu') then
    raise exception 'Hanya Admin atau KWU yang boleh mengubah status pesanan.'
      using errcode = '42501';
  end if;

  select * into v_order from public.orders
  where order_code = upper(trim(p_order_code));
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = '22023';
  end if;

  v_new_ord := coalesce(p_order_status, v_order.order_status);
  v_new_pay := coalesce(p_payment_status, v_order.payment_status);

  if v_new_ord not in ('pending_verifikasi', 'terjual', 'dibatalkan', 'kadaluarsa') then
    raise exception 'Status pesanan tidak valid.' using errcode = '22023';
  end if;
  if v_new_pay not in ('belum_lunas', 'dp', 'lunas') then
    raise exception 'Status pembayaran tidak valid.' using errcode = '22023';
  end if;

  if v_order.order_status <> v_new_ord then
    if v_new_ord = 'terjual' and v_order.order_status = 'pending_verifikasi' then
      perform public.apply_order_stock(v_order.id, 'commit');
    elsif v_new_ord in ('dibatalkan', 'kadaluarsa')
          and v_order.order_status = 'pending_verifikasi' then
      perform public.apply_order_stock(v_order.id, 'release');
    elsif v_new_ord in ('dibatalkan', 'kadaluarsa')
          and v_order.order_status = 'terjual' then
      perform public.apply_order_stock(v_order.id, 'rehold');
      perform public.apply_order_stock(v_order.id, 'release');
    elsif v_new_ord = 'pending_verifikasi' and v_order.order_status = 'terjual' then
      perform public.apply_order_stock(v_order.id, 'rehold');
    elsif v_new_ord = 'pending_verifikasi'
          and v_order.order_status in ('dibatalkan', 'kadaluarsa') then
      raise exception 'Pesanan yang sudah dibatalkan tidak bisa diaktifkan lagi. Buat pesanan baru.'
        using errcode = '22023';
    end if;
  end if;

  select coalesce(nullif(p.display_name, ''), s.full_name, s.email) into v_actor
  from public.staff s
  left join public.profiles p on p.id = s.id
  where s.id = auth.uid();

  update public.orders
  set order_status   = v_new_ord,
      payment_status = v_new_pay,
      verified_by    = case when v_new_ord = 'terjual' then coalesce(v_actor, 'Pengurus')
                            else verified_by end,
      verified_at    = case when v_new_ord = 'terjual' then now()
                            else verified_at end
  where id = v_order.id;

  return jsonb_build_object(
    'order_code', v_order.order_code,
    'order_status', v_new_ord,
    'payment_status', v_new_pay
  );
end;
$$;
revoke all on function public.set_order_status(text, text, text) from public, anon;
grant execute on function public.set_order_status(text, text, text) to authenticated;

-- SEO produk & berita lewat RPC: Kominfo boleh mengubah SEO produk tanpa
-- ikut bisa mengubah harga/stok (RLS tidak bisa membatasi per kolom).
create or replace function public.set_content_seo(
  p_table text,
  p_id text,
  p_seo jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare v_seo jsonb;
begin
  if not public.has_staff_role('admin', 'kominfo') then
    raise exception 'Hanya Admin atau Kominfo yang boleh mengubah SEO.' using errcode = '42501';
  end if;
  if p_seo is null or jsonb_typeof(p_seo) <> 'object' then
    raise exception 'Data SEO tidak valid.' using errcode = '22023';
  end if;

  v_seo := jsonb_build_object(
    'title', left(coalesce(p_seo ->> 'title', ''), 90),
    'description', left(coalesce(p_seo ->> 'description', ''), 220),
    'ogImage', left(coalesce(p_seo ->> 'ogImage', ''), 500)
  );

  if p_table = 'products' then
    update public.products set seo = v_seo where id = p_id;
  elsif p_table = 'articles' then
    update public.articles set seo = v_seo where id = p_id;
  else
    raise exception 'Tabel tidak dikenal.' using errcode = '22023';
  end if;

  if not found then
    raise exception 'Data tidak ditemukan.' using errcode = '22023';
  end if;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.set_content_seo(text, text, jsonb) from public, anon;
grant execute on function public.set_content_seo(text, text, jsonb) to authenticated;


-- ---------------------------------------------------------------------------
-- 6. Absensi: sesi + catatan kehadiran.
--    QR berisi "HMTL-ABSEN:<id sesi>:<token>". Token = HMAC rahasia sesi.
--    Mode berganti: token berubah tiap 30 detik (foto QR cepat basi).
--    Mode statis: token tetap (bisa dicetak).
--    Lokasi opsional, radius maksimal 15 meter dari titik yang ditetapkan.
-- ---------------------------------------------------------------------------
create table if not exists public.attendance_sessions (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(trim(title)) between 2 and 120),
  description      text not null default '',
  department_id    text references public.departments (id) on delete set null,
  starts_at        timestamptz not null,
  ends_at          timestamptz not null,
  require_location boolean not null default false,
  latitude         double precision check (latitude between -90 and 90),
  longitude        double precision check (longitude between -180 and 180),
  radius_m         integer check (radius_m between 1 and 15),
  rotate_qr        boolean not null default true,
  qr_secret        text not null default encode(extensions.gen_random_bytes(24), 'hex'),
  is_active        boolean not null default true,
  created_by       uuid references auth.users (id) on delete set null,
  created_at       timestamptz not null default now(),
  constraint attendance_window check (ends_at > starts_at),
  constraint attendance_location check (
    not require_location
    or (latitude is not null and longitude is not null and radius_m is not null)
  )
);
create index if not exists attendance_sessions_time_idx
  on public.attendance_sessions (starts_at desc);

create table if not exists public.attendance_records (
  id            uuid primary key default gen_random_uuid(),
  session_id    uuid not null references public.attendance_sessions (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  department_id text references public.departments (id) on delete set null,
  display_name  text,
  checked_at    timestamptz not null default now(),
  latitude      double precision,
  longitude     double precision,
  accuracy_m    real,
  distance_m    real,
  unique (session_id, user_id)
);
create index if not exists attendance_records_user_idx
  on public.attendance_records (user_id, checked_at desc);

alter table public.attendance_sessions enable row level security;
alter table public.attendance_records enable row level security;

drop policy if exists "admin manages attendance sessions" on public.attendance_sessions;
create policy "admin manages attendance sessions" on public.attendance_sessions
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "admin reads attendance" on public.attendance_records;
create policy "admin reads attendance" on public.attendance_records
  for select to authenticated
  using (public.is_admin());

drop policy if exists "admin deletes attendance" on public.attendance_records;
create policy "admin deletes attendance" on public.attendance_records
  for delete to authenticated
  using (public.is_admin());

revoke all on public.attendance_sessions from anon;
revoke all on public.attendance_records from anon;
-- Catatan kehadiran hanya masuk lewat check_in_attendance().
revoke insert, update, truncate on public.attendance_records from authenticated;

-- Token QR (internal, tidak bisa dipanggil dari API).
create or replace function public.attendance_token(p_secret text, p_window bigint)
returns text
language sql
immutable
set search_path = public, extensions, pg_temp
as $$
  select left(encode(extensions.hmac(p_window::text, p_secret, 'sha256'), 'hex'), 16);
$$;
revoke all on function public.attendance_token(text, bigint) from public, anon, authenticated;

-- Isi QR untuk layar admin.
create or replace function public.attendance_qr_payload(p_session uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s       public.attendance_sessions%rowtype;
  v_epoch bigint := floor(extract(epoch from clock_timestamp()));
  v_win   bigint;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menampilkan QR absensi.' using errcode = '42501';
  end if;
  select * into s from public.attendance_sessions where id = p_session;
  if not found then
    raise exception 'Sesi absensi tidak ditemukan.' using errcode = '22023';
  end if;

  v_win := case when s.rotate_qr then v_epoch / 30 else 0 end;
  return jsonb_build_object(
    'payload', 'HMTL-ABSEN:' || s.id::text || ':' || public.attendance_token(s.qr_secret, v_win),
    'rotate', s.rotate_qr,
    'expires_in', case when s.rotate_qr then 30 - (v_epoch % 30) else null end
  );
end;
$$;
revoke all on function public.attendance_qr_payload(uuid) from public, anon;
grant execute on function public.attendance_qr_payload(uuid) to authenticated;

-- Absen: dipanggil anggota setelah scan QR.
create or replace function public.check_in_attendance(
  p_payload   text,
  p_latitude  double precision default null,
  p_longitude double precision default null,
  p_accuracy  double precision default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid      uuid := auth.uid();
  v_profile  public.profiles%rowtype;
  v_parts    text[];
  v_session  uuid;
  v_token    text;
  s          public.attendance_sessions%rowtype;
  v_win      bigint;
  v_valid    boolean;
  v_distance double precision;
  v_name     text;
  v_existing timestamptz;
begin
  if v_uid is null then
    raise exception 'Silakan masuk dulu.' using errcode = '42501';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if not found or v_profile.department_id is null then
    raise exception 'Akunmu belum terdaftar sebagai anggota departemen. Hubungi admin.'
      using errcode = '42501';
  end if;

  v_parts := regexp_match(
    coalesce(trim(p_payload), ''),
    '^HMTL-ABSEN:([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}):([0-9a-f]{16})$'
  );
  if v_parts is null then
    raise exception 'QR ini bukan QR absensi HMTL.' using errcode = '22023';
  end if;
  v_session := v_parts[1]::uuid;
  v_token := v_parts[2];

  select * into s from public.attendance_sessions where id = v_session;
  if not found then
    raise exception 'Sesi absensi tidak ditemukan.' using errcode = '22023';
  end if;
  if not s.is_active then
    raise exception 'Sesi absensi sudah ditutup.' using errcode = '22023';
  end if;
  if now() < s.starts_at then
    raise exception 'Absensi belum dibuka. Dibuka %.',
      to_char(s.starts_at at time zone 'Asia/Pontianak', 'DD/MM HH24:MI "WIB"')
      using errcode = '22023';
  end if;
  if now() > s.ends_at then
    raise exception 'Waktu absensi sudah berakhir.' using errcode = '22023';
  end if;
  if s.department_id is not null and s.department_id <> v_profile.department_id then
    raise exception 'Sesi ini khusus untuk departemen lain.' using errcode = '42501';
  end if;

  if s.rotate_qr then
    v_win := floor(extract(epoch from clock_timestamp()))::bigint / 30;
    v_valid := v_token in (
      public.attendance_token(s.qr_secret, v_win),
      public.attendance_token(s.qr_secret, v_win - 1)
    );
  else
    v_valid := v_token = public.attendance_token(s.qr_secret, 0);
  end if;
  if not v_valid then
    raise exception 'QR sudah kedaluwarsa. Scan ulang QR yang sedang tampil.' using errcode = '22023';
  end if;

  -- Sudah absen? Kembalikan waktunya, bukan error.
  select checked_at into v_existing
  from public.attendance_records
  where session_id = s.id and user_id = v_uid;
  if v_existing is not null then
    return jsonb_build_object(
      'ok', true, 'already', true,
      'session_title', s.title, 'checked_at', v_existing
    );
  end if;

  if s.require_location then
    if p_latitude is null or p_longitude is null then
      raise exception 'Sesi ini butuh lokasi. Izinkan akses lokasi lalu scan lagi.'
        using errcode = '22023';
    end if;
    if p_latitude not between -90 and 90 or p_longitude not between -180 and 180 then
      raise exception 'Koordinat tidak valid.' using errcode = '22023';
    end if;
    if p_accuracy is not null and p_accuracy > 50 then
      raise exception 'Sinyal GPS kurang akurat (±% m). Pindah ke dekat jendela/area terbuka lalu scan lagi.',
        round(p_accuracy::numeric)
        using errcode = '22023';
    end if;

    -- Haversine, jari-jari bumi 6.371 km.
    v_distance := 2 * 6371000 * asin(sqrt(
      power(sin(radians(p_latitude - s.latitude) / 2), 2)
      + cos(radians(s.latitude)) * cos(radians(p_latitude))
        * power(sin(radians(p_longitude - s.longitude) / 2), 2)
    ));
    if v_distance > s.radius_m then
      raise exception 'Kamu berada % m dari titik absen. Maksimal % m.',
        round(v_distance::numeric), s.radius_m
        using errcode = '22023';
    end if;
  end if;

  v_name := coalesce(
    v_profile.display_name,
    (select split_part(email, '@', 1) from auth.users where id = v_uid)
  );

  insert into public.attendance_records (
    session_id, user_id, department_id, display_name,
    latitude, longitude, accuracy_m, distance_m
  )
  values (
    s.id, v_uid, v_profile.department_id, v_name,
    p_latitude, p_longitude, p_accuracy, v_distance
  )
  on conflict (session_id, user_id) do nothing;

  return jsonb_build_object(
    'ok', true, 'already', false,
    'session_title', s.title, 'checked_at', now(),
    'distance_m', case when v_distance is null then null else round(v_distance::numeric) end
  );
end;
$$;
revoke all on function public.check_in_attendance(text, double precision, double precision, double precision)
  from public, anon;
grant execute on function public.check_in_attendance(text, double precision, double precision, double precision)
  to authenticated;

-- Riwayat absensi milik si pemanggil (30 terakhir).
create or replace function public.my_attendance()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(x.j order by x.checked_at desc), '[]'::jsonb)
  from (
    select r.checked_at,
           jsonb_build_object(
             'session_title', s.title,
             'checked_at', r.checked_at,
             'distance_m', r.distance_m
           ) as j
    from public.attendance_records r
    join public.attendance_sessions s on s.id = r.session_id
    where r.user_id = auth.uid()
    order by r.checked_at desc
    limit 30
  ) x;
$$;
revoke all on function public.my_attendance() from public, anon;
grant execute on function public.my_attendance() to authenticated;
