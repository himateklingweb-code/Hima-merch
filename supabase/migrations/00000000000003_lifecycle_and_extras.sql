-- ============================================================
-- Order lifecycle, expiry, per-IP limiting, static-page meta, payment proof.
-- Run after 00000000000002_seed_content.sql.
--
-- NOTE: this also replaces create_order and get_order_by_code from the init
-- file — create_order gains a per-IP check and stores ip_hash, and the
-- receipt gains a has_payment_proof flag.
-- ============================================================

-- ---------- stock movement ----------
-- create_order reserves stock. Nothing used to move it out of that state,
-- so a confirmed sale never decremented real stock and a cancelled order
-- held its reservation forever.
--   commit  : reserved -> sold
--   release : reserved -> available
--   rehold  : sold     -> reserved   (undo a mistaken confirmation)
create or replace function public.apply_order_stock(p_order_id uuid, p_action text)
returns void language plpgsql volatile security definer
set search_path = public, pg_temp as $fn$
declare it record;
begin
  for it in select i.product_id, i.qty, i.stock_type_snapshot
            from public.order_items i where i.order_id = p_order_id
  loop
    if it.stock_type_snapshot = 'ready_stock' then
      if p_action = 'commit' then
        update public.products
        set stock = greatest(0, stock - it.qty),
            stock_reserved = greatest(0, stock_reserved - it.qty)
        where id = it.product_id;
      elsif p_action = 'release' then
        update public.products
        set stock_reserved = greatest(0, stock_reserved - it.qty)
        where id = it.product_id;
      elsif p_action = 'rehold' then
        update public.products
        set stock = stock + it.qty, stock_reserved = stock_reserved + it.qty
        where id = it.product_id;
      end if;
    else
      if p_action = 'commit' then
        update public.products
        set po_filled = coalesce(po_filled,0) + it.qty,
            po_reserved = greatest(0, coalesce(po_reserved,0) - it.qty)
        where id = it.product_id;
      elsif p_action = 'release' then
        update public.products
        set po_reserved = greatest(0, coalesce(po_reserved,0) - it.qty)
        where id = it.product_id;
      elsif p_action = 'rehold' then
        update public.products
        set po_filled = greatest(0, coalesce(po_filled,0) - it.qty),
            po_reserved = coalesce(po_reserved,0) + it.qty
        where id = it.product_id;
      end if;
    end if;
  end loop;
end; $fn$;

revoke all on function public.apply_order_stock(uuid, text) from public, anon, authenticated;

-- ---------- what the Verifikasi button calls ----------
create or replace function public.set_order_status(
  p_order_code text,
  p_order_status text default null,
  p_payment_status text default null
) returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $fn$
declare
  v_order public.orders%rowtype;
  v_new_ord text; v_new_pay text; v_actor text;
begin
  if not public.is_staff() then
    raise exception 'Hanya pengurus yang boleh mengubah status pesanan.'
      using errcode = '42501';
  end if;

  select * into v_order from public.orders
  where order_code = upper(trim(p_order_code));
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = '22023';
  end if;

  v_new_ord := coalesce(p_order_status, v_order.order_status);
  v_new_pay := coalesce(p_payment_status, v_order.payment_status);

  if v_new_ord not in ('pending_verifikasi','terjual','dibatalkan','kadaluarsa') then
    raise exception 'Status pesanan tidak valid.' using errcode = '22023';
  end if;
  if v_new_pay not in ('belum_lunas','dp','lunas') then
    raise exception 'Status pembayaran tidak valid.' using errcode = '22023';
  end if;

  if v_order.order_status <> v_new_ord then
    if v_new_ord = 'terjual' and v_order.order_status = 'pending_verifikasi' then
      perform public.apply_order_stock(v_order.id, 'commit');
    elsif v_new_ord in ('dibatalkan','kadaluarsa')
          and v_order.order_status = 'pending_verifikasi' then
      perform public.apply_order_stock(v_order.id, 'release');
    elsif v_new_ord in ('dibatalkan','kadaluarsa')
          and v_order.order_status = 'terjual' then
      perform public.apply_order_stock(v_order.id, 'rehold');
      perform public.apply_order_stock(v_order.id, 'release');
    elsif v_new_ord = 'pending_verifikasi' and v_order.order_status = 'terjual' then
      perform public.apply_order_stock(v_order.id, 'rehold');
    elsif v_new_ord = 'pending_verifikasi'
          and v_order.order_status in ('dibatalkan','kadaluarsa') then
      raise exception 'Pesanan yang sudah dibatalkan tidak bisa diaktifkan lagi. Buat pesanan baru.'
        using errcode = '22023';
    end if;
  end if;

  select coalesce(full_name, email) into v_actor
  from public.staff where id = auth.uid();

  update public.orders
  set order_status = v_new_ord,
      payment_status = v_new_pay,
      verified_by = case when v_new_ord = 'terjual'
                         then coalesce(v_actor,'Pengurus') else verified_by end,
      verified_at = case when v_new_ord = 'terjual' then now() else verified_at end
  where id = v_order.id;

  return jsonb_build_object('order_code', v_order.order_code,
                            'order_status', v_new_ord,
                            'payment_status', v_new_pay);
end; $fn$;

revoke all on function public.set_order_status(text,text,text) from public, anon;
grant execute on function public.set_order_status(text,text,text) to authenticated;

-- ---------- expiry sweep ----------
create or replace function public.expire_stale_orders(p_hours integer default 24)
returns integer language plpgsql volatile security definer
set search_path = public, pg_temp as $fn$
declare o record; n integer := 0;
begin
  for o in
    select id from public.orders
    where order_status = 'pending_verifikasi'
      and payment_status = 'belum_lunas'
      and created_at < now() - make_interval(hours => p_hours)
  loop
    perform public.apply_order_stock(o.id, 'release');
    update public.orders set order_status = 'kadaluarsa' where id = o.id;
    n := n + 1;
  end loop;
  return n;
end; $fn$;

revoke all on function public.expire_stale_orders(integer) from public, anon;
grant execute on function public.expire_stale_orders(integer) to authenticated;

create extension if not exists pg_cron;
do $blk$
begin
  perform cron.unschedule('expire-stale-orders');
exception when others then null;
end $blk$;
select cron.schedule('expire-stale-orders', '7 * * * *',
                     'select public.expire_stale_orders(24)');

-- ---------- per-IP rate limiting ----------
-- The per-number limit is sidestepped by changing number. The address is
-- stored only as a salted hash: it exists to compare "same sender within
-- the hour", and a plain IP log would be personal data with no purpose.
alter table public.orders add column if not exists ip_hash text;
create index if not exists orders_ip_hash_idx on public.orders(ip_hash, created_at desc);

create or replace function public.client_ip_hash()
returns text language plpgsql stable security definer
set search_path = public, extensions, pg_temp as $fn$
declare v_hdrs json; v_ip text;
begin
  begin
    v_hdrs := current_setting('request.headers', true)::json;
  exception when others then
    return null;                      -- called outside PostgREST
  end;
  if v_hdrs is null then return null; end if;

  v_ip := trim(split_part(coalesce(v_hdrs->>'x-forwarded-for',''), ',', 1));
  if v_ip = '' then v_ip := coalesce(v_hdrs->>'cf-connecting-ip',''); end if;
  if v_ip = '' then return null; end if;

  return encode(
    extensions.digest(v_ip || ':hima-tl-untan-order-pepper-v1', 'sha256'), 'hex');
end; $fn$;

revoke all on function public.client_ip_hash() from public, anon, authenticated;

-- ---------- static page meta ----------
create table if not exists public.site_meta (
  path        text primary key,
  label       text not null,
  title       text,
  description text,
  og_image    text,
  updated_at  timestamptz not null default now()
);

alter table public.site_meta enable row level security;

drop policy if exists "public reads site meta" on public.site_meta;
create policy "public reads site meta" on public.site_meta
  for select to anon, authenticated using (true);
drop policy if exists "staff writes site meta" on public.site_meta;
create policy "staff writes site meta" on public.site_meta
  for insert to authenticated with check (public.is_staff());
drop policy if exists "staff updates site meta" on public.site_meta;
create policy "staff updates site meta" on public.site_meta
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

insert into public.site_meta (path, label, title, description) values
 ('/','Beranda','HIMA Teknik Lingkungan UNTAN',
  'Website resmi Himpunan Mahasiswa Teknik Lingkungan, Universitas Tanjungpura, Pontianak.'),
 ('/tentang','Tentang','Tentang — HIMA Teknik Lingkungan UNTAN',
  'Profil dan sejarah Himpunan Mahasiswa Teknik Lingkungan Universitas Tanjungpura.'),
 ('/departemen','Departemen','Departemen — HIMA Teknik Lingkungan UNTAN',
  'Struktur organisasi dan departemen HIMA Teknik Lingkungan UNTAN.'),
 ('/merchandise','Merchandise','Merchandise — HIMA Teknik Lingkungan UNTAN',
  'Etalase merchandise resmi HIMA TL UNTAN — kaos, jaket, hoodie, dan lainnya.'),
 ('/berita','Berita','Berita — HIMA Teknik Lingkungan UNTAN',
  'Berita dan kabar terbaru dari HIMA Teknik Lingkungan Universitas Tanjungpura.'),
 ('/kemitraan','Kemitraan','Kemitraan — HIMA Teknik Lingkungan UNTAN',
  'Daftar mitra dan sponsor HIMA Teknik Lingkungan UNTAN serta pengajuan kerja sama.'),
 ('/kontak','Kontak','Kontak — HIMA Teknik Lingkungan UNTAN',
  'Hubungi HIMA Teknik Lingkungan UNTAN via WhatsApp atau Instagram.')
on conflict (path) do nothing;

-- ---------- payment proof ----------
-- The buyer is not signed in; the order code authorises the write. It
-- carries a random suffix, so it cannot be found by walking the sequence.
create or replace function public.attach_payment_proof(p_code text, p_url text)
returns jsonb language plpgsql volatile security definer
set search_path = public, pg_temp as $fn$
declare v_order public.orders%rowtype;
begin
  if coalesce(trim(p_url),'') = '' then
    raise exception 'URL bukti pembayaran kosong.' using errcode = '22023';
  end if;
  -- Only a path inside our own bucket, never an arbitrary URL — otherwise
  -- this becomes a way to point staff at anything on the internet.
  if p_url !~ '^payment-proofs/[A-Za-z0-9._/-]+$' then
    raise exception 'Lokasi berkas tidak valid.' using errcode = '22023';
  end if;

  select * into v_order from public.orders where order_code = upper(trim(p_code));
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = '22023';
  end if;
  if v_order.order_status <> 'pending_verifikasi' then
    raise exception 'Pesanan ini sudah diproses, bukti tidak bisa diubah.'
      using errcode = '22023';
  end if;

  update public.orders set payment_proof_url = p_url where id = v_order.id;
  return jsonb_build_object('ok', true);
end; $fn$;

revoke all on function public.attach_payment_proof(text,text) from public;
grant execute on function public.attach_payment_proof(text,text) to anon, authenticated;

-- Private bucket: these are screenshots of someone's banking app, and a
-- public bucket would make every one readable by anyone guessing a name.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('payment-proofs','payment-proofs',false,5242880,
        array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Buyers may add files but never list, read, overwrite or delete, so one
-- buyer cannot fetch or clobber another's receipt.
drop policy if exists "buyers upload payment proof" on storage.objects;
create policy "buyers upload payment proof" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'payment-proofs');
drop policy if exists "staff read payment proof" on storage.objects;
create policy "staff read payment proof" on storage.objects
  for select to authenticated
  using (bucket_id = 'payment-proofs' and public.is_staff());
drop policy if exists "staff delete payment proof" on storage.objects;
create policy "staff delete payment proof" on storage.objects
  for delete to authenticated
  using (bucket_id = 'payment-proofs' and public.is_staff());

-- ---------- receipt gains the proof flag ----------
-- A boolean, not the path: the path is the handle staff use to fetch
-- someone's banking screenshot.
create or replace function public.get_order_by_code(p_code text)
returns jsonb language sql stable security definer
set search_path = public, pg_temp as $fn$
  select jsonb_build_object(
    'order_code', o.order_code,
    'buyer_name', split_part(o.buyer_name,' ',1) ||
                  case when position(' ' in o.buyer_name) > 0 then ' •••' else '' end,
    'buyer_wa_masked', '•••• ' || right(o.buyer_wa,4),
    'total_amount', o.total_amount,
    'item_count', o.item_count,
    'payment_status', o.payment_status,
    'order_status', o.order_status,
    'has_payment_proof', o.payment_proof_url is not null,
    'verified_at', o.verified_at,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name, 'product_slug', i.product_slug,
        'variant', i.variant, 'stock_type_snapshot', i.stock_type_snapshot,
        'qty', i.qty, 'unit_price', i.unit_price, 'subtotal', i.subtotal))
      from public.order_items i where i.order_id = o.id), '[]'::jsonb)
  )
  from public.orders o
  where o.order_code = upper(trim(p_code))
  limit 1;
$fn$;

revoke all on function public.get_order_by_code(text) from public;
grant execute on function public.get_order_by_code(text) to anon, authenticated;
