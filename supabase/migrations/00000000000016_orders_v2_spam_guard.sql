-- =====================================================================
-- 0016 — Pesanan v2, anti-spam & blokir, biaya tambahan varian,
--        kuota gabungan, gambar di riwayat pesanan.
--
-- Ringkasan:
--   1. Pesanan: batas bayar 24 jam (pay_deadline), nominal DP, status
--      barang diterima, pengajuan batal oleh pembeli, alasan batal,
--      catatan pengurus, sembunyikan dari riwayat pembeli.
--   2. order_items menyimpan foto produk/varian saat dipesan.
--   3. Produk pre-order bisa memakai kuota GABUNGAN (satu angka untuk
--      semua varian) atau kuota PER VARIAN.
--   4. Atribut varian menyimpan biaya tambahan per pilihan
--      (mis. 2XL +5000, Lengan Panjang +10000).
--   5. Anti-spam: jeda minimal 2 detik per aksi; spam berulang atau pola
--      bot diblokir 1 minggu. Admin bisa membuka blokir.
--   6. Aksi pengurus lewat satu RPC (admin_order_action). Pesanan lunas
--      tidak bisa dibatalkan. Stok selalu dikembalikan saat batal.
--   7. Pesanan belum dibayar dibatalkan otomatis setelah 24 jam
--      (pg_cron tiap 5 menit).
--
-- Aman dijalankan ulang (idempoten).
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Kolom baru pesanan
-- ---------------------------------------------------------------------
alter table public.orders
  add column if not exists pay_deadline          timestamptz,
  add column if not exists amount_paid           integer not null default 0,
  add column if not exists received_at           timestamptz,
  add column if not exists received_by           text,
  add column if not exists cancel_requested_at   timestamptz,
  add column if not exists cancel_request_reason text,
  add column if not exists cancel_reject_note    text,
  add column if not exists cancelled_at          timestamptz,
  add column if not exists cancelled_by          text,
  add column if not exists cancel_reason         text,
  add column if not exists admin_note            text,
  add column if not exists hidden_by_buyer       boolean not null default false;

update public.orders
set pay_deadline = created_at + interval '24 hours'
where pay_deadline is null;

alter table public.orders alter column pay_deadline set default (now() + interval '24 hours');
alter table public.orders alter column pay_deadline set not null;

update public.orders
set amount_paid = total_amount
where payment_status = 'lunas' and amount_paid = 0;

alter table public.orders drop constraint if exists orders_amount_paid_check;
alter table public.orders add constraint orders_amount_paid_check check (amount_paid >= 0);

alter table public.orders drop constraint if exists orders_text_len_check;
alter table public.orders add constraint orders_text_len_check check (
  coalesce(char_length(cancel_request_reason), 0) <= 300 and
  coalesce(char_length(cancel_reject_note), 0)    <= 300 and
  coalesce(char_length(cancel_reason), 0)         <= 300 and
  coalesce(char_length(admin_note), 0)            <= 1000
);

create index if not exists orders_status_deadline_idx
  on public.orders (order_status, payment_status, pay_deadline);

-- ---------------------------------------------------------------------
-- 2. Foto di baris pesanan + penanda kuota gabungan
-- ---------------------------------------------------------------------
alter table public.order_items
  add column if not exists image       text,
  add column if not exists shared_pool boolean not null default false;

update public.order_items i
set image = coalesce(
  (select nullif(v.image, '') from public.product_variants v where v.id = i.variant_id),
  (select pi.url from public.product_images pi
    where pi.product_id = i.product_id order by pi.order_index limit 1)
)
where i.image is null;

-- ---------------------------------------------------------------------
-- 3 & 4. Kuota gabungan + biaya tambahan per pilihan
-- ---------------------------------------------------------------------
alter table public.products
  add column if not exists quota_mode text not null default 'per_variant';
alter table public.products drop constraint if exists products_quota_mode_check;
alter table public.products add constraint products_quota_mode_check
  check (quota_mode in ('per_variant', 'shared'));

alter table public.product_attributes
  add column if not exists price_adjustments jsonb not null default '{}'::jsonb;
alter table public.product_attributes drop constraint if exists product_attributes_adjustments_check;
alter table public.product_attributes add constraint product_attributes_adjustments_check
  check (jsonb_typeof(price_adjustments) = 'object');

-- ---------------------------------------------------------------------
-- 5. Anti-spam & blokir
-- ---------------------------------------------------------------------
create table if not exists public.rate_guard (
  subject      text primary key,             -- 'u:<uuid>' atau 'ip:<hash>'
  last_at      timestamptz not null default now(),
  strikes      integer     not null default 0,
  strike_from  timestamptz not null default now(),
  burst        integer     not null default 0,
  burst_from   timestamptz not null default now()
);
alter table public.rate_guard enable row level security;
revoke all on public.rate_guard from anon, authenticated;

create table if not exists public.bans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete cascade,
  ip_hash      text,
  label        text,
  reason       text not null,
  banned_until timestamptz not null,
  created_at   timestamptz not null default now(),
  created_by   text not null default 'Sistem',
  lifted_at    timestamptz,
  lifted_by    text,
  constraint bans_subject_check check (user_id is not null or ip_hash is not null)
);
create index if not exists bans_user_active_idx on public.bans (user_id) where lifted_at is null;
create index if not exists bans_ip_active_idx   on public.bans (ip_hash) where lifted_at is null;
alter table public.bans enable row level security;
revoke all on public.bans from anon, authenticated;

/*
 * Dipanggil di awal setiap aksi pembeli. Mengembalikan NULL bila boleh
 * lanjut, atau pesan penolakan. Sengaja TIDAK raise: pemanggil
 * mengembalikan pesan sebagai jsonb supaya catatan pelanggaran tetap
 * tersimpan (raise akan me-rollback catatan itu).
 *
 * Aturan:
 *   - Jeda minimal 2 detik antar-aksi. Lebih cepat = 1 pelanggaran.
 *   - 5 pelanggaran dalam 10 menit  -> blokir 7 hari.
 *   - Lebih dari 20 aksi dalam 1 menit (pola bot) -> blokir 7 hari
 *     (tamu per jaringan: 40, karena satu wifi bisa dipakai banyak orang).
 *   - Pengurus (staff) tidak pernah dibatasi.
 *   - Akun login dibatasi per akun (bukan per IP) supaya satu wifi
 *     kampus tidak ikut terblokir. Tamu dibatasi per IP (hash).
 */
create or replace function public.spam_guard(p_action text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid     uuid := auth.uid();
  v_ip      text;
  v_subject text;
  v_now     timestamptz := clock_timestamp();
  v_row     public.rate_guard%rowtype;
  v_fast    boolean;
  v_until   timestamptz;
  v_label   text;
begin
  if v_uid is not null and public.is_staff() then
    return null;
  end if;
  if v_uid is null then
    v_ip := public.client_ip_hash();
  end if;

  select b.banned_until into v_until
  from public.bans b
  where b.lifted_at is null
    and b.banned_until > v_now
    and ((v_uid is not null and b.user_id = v_uid)
         or (v_uid is null and v_ip is not null and b.ip_hash = v_ip))
  order by b.banned_until desc
  limit 1;
  if found then
    return format(
      'Akses diblokir sampai %s WIB karena terdeteksi spam. Hubungi pengurus bila ini keliru.',
      to_char(v_until at time zone 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI'));
  end if;

  v_subject := case
    when v_uid is not null then 'u:' || v_uid::text
    when v_ip  is not null then 'ip:' || v_ip
  end;
  if v_subject is null then
    return null;
  end if;

  insert into public.rate_guard (subject, last_at, strike_from, burst_from)
  values (v_subject, v_now - interval '1 hour', v_now, v_now)
  on conflict (subject) do nothing;

  select * into v_row from public.rate_guard where subject = v_subject for update;

  if v_row.strike_from < v_now - interval '10 minutes' then
    v_row.strikes := 0;
    v_row.strike_from := v_now;
  end if;
  if v_row.burst_from < v_now - interval '1 minute' then
    v_row.burst := 0;
    v_row.burst_from := v_now;
  end if;

  v_fast := v_now - v_row.last_at < interval '2 seconds';
  if v_fast then
    v_row.strikes := v_row.strikes + 1;
  end if;
  v_row.burst := v_row.burst + 1;

  if v_row.strikes >= 5 or v_row.burst > (case when v_uid is null then 40 else 20 end) then
    if v_uid is not null then
      select coalesce(nullif(p.display_name, ''), u.email) into v_label
      from auth.users u left join public.profiles p on p.id = u.id
      where u.id = v_uid;
    end if;
    insert into public.bans (user_id, ip_hash, label, reason, banned_until)
    values (
      v_uid,
      case when v_uid is null then v_ip end,
      coalesce(v_label, 'Tamu (jaringan ' || left(coalesce(v_ip, '?'), 8) || ')'),
      case when v_row.burst > (case when v_uid is null then 40 else 20 end)
        then format('Pola bot: terlalu banyak aksi dalam 1 menit (%s).', p_action)
        else format('Spam: 5 kali aksi lebih cepat dari 2 detik dalam 10 menit (%s).', p_action)
      end,
      v_now + interval '7 days'
    );
    update public.rate_guard
    set last_at = v_now, strikes = 0, strike_from = v_now, burst = 0, burst_from = v_now
    where subject = v_subject;
    return format(
      'Akses diblokir sampai %s WIB karena terdeteksi spam. Hubungi pengurus bila ini keliru.',
      to_char((v_now + interval '7 days') at time zone 'Asia/Jakarta', 'DD-MM-YYYY HH24:MI'));
  end if;

  update public.rate_guard
  set last_at = v_now,
      strikes = v_row.strikes, strike_from = v_row.strike_from,
      burst = v_row.burst, burst_from = v_row.burst_from
  where subject = v_subject;

  if v_fast then
    return 'Terlalu cepat. Tunggu 2 detik lalu coba lagi.';
  end if;
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- Kuota gabungan: penghitung produk SELALU = jumlah penghitung varian.
-- Dihitung ulang (bukan ditambah/kurang) supaya tetap benar walau mode
-- kuota diganti setelah ada pesanan.
-- ---------------------------------------------------------------------
create or replace function public.sync_shared_counters(p_product_id text)
returns void
language sql
security definer
set search_path = public, pg_temp
as $$
  update public.products p
  set po_filled   = coalesce((select sum(po_filled)   from public.product_variants where product_id = p.id), 0),
      po_reserved = coalesce((select sum(po_reserved) from public.product_variants where product_id = p.id), 0)
  where p.id = p_product_id
    and p.stock_type = 'pre_order'
    and p.quota_mode = 'shared'
    and exists (select 1 from public.product_variants where product_id = p.id);
$$;

-- ---------------------------------------------------------------------
-- Stok: kuota gabungan ikut menggerakkan penghitung tingkat produk
-- ---------------------------------------------------------------------
create or replace function public.apply_order_stock(p_order_id uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  it record;
begin
  for it in
    select i.product_id, i.variant_id, i.qty, i.stock_type_snapshot
    from public.order_items i
    where i.order_id = p_order_id
  loop
    -- Penghitung varian (selalu, supaya rekap per varian tetap akurat).
    if it.variant_id is not null then
      if it.stock_type_snapshot = 'ready_stock' then
        if p_action = 'commit' then
          update public.product_variants
          set stock = greatest(0, stock - it.qty),
              stock_reserved = greatest(0, stock_reserved - it.qty)
          where id = it.variant_id;
        elsif p_action = 'release' then
          update public.product_variants
          set stock_reserved = greatest(0, stock_reserved - it.qty)
          where id = it.variant_id;
        elsif p_action = 'rehold' then
          update public.product_variants
          set stock = stock + it.qty, stock_reserved = stock_reserved + it.qty
          where id = it.variant_id;
        end if;
      else
        if p_action = 'commit' then
          update public.product_variants
          set po_filled = coalesce(po_filled, 0) + it.qty,
              po_reserved = greatest(0, coalesce(po_reserved, 0) - it.qty)
          where id = it.variant_id;
        elsif p_action = 'release' then
          update public.product_variants
          set po_reserved = greatest(0, coalesce(po_reserved, 0) - it.qty)
          where id = it.variant_id;
        elsif p_action = 'rehold' then
          update public.product_variants
          set po_filled = greatest(0, coalesce(po_filled, 0) - it.qty),
              po_reserved = coalesce(po_reserved, 0) + it.qty
          where id = it.variant_id;
        end if;
      end if;
    end if;

    if it.variant_id is not null then
      perform public.sync_shared_counters(it.product_id);
    end if;

    -- Penghitung produk untuk produk tanpa varian.
    if it.variant_id is null then
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
          set po_filled = coalesce(po_filled, 0) + it.qty,
              po_reserved = greatest(0, coalesce(po_reserved, 0) - it.qty)
          where id = it.product_id;
        elsif p_action = 'release' then
          update public.products
          set po_reserved = greatest(0, coalesce(po_reserved, 0) - it.qty)
          where id = it.product_id;
        elsif p_action = 'rehold' then
          update public.products
          set po_filled = greatest(0, coalesce(po_filled, 0) - it.qty),
              po_reserved = coalesce(po_reserved, 0) + it.qty
          where id = it.product_id;
        end if;
      end if;
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- create_order: anti-spam, kunci baris (anti oversell), kuota gabungan,
-- batas per pesanan di server, simpan foto. Galat dikembalikan sebagai
-- {"error": "..."} supaya catatan anti-spam tidak ikut ter-rollback.
-- ---------------------------------------------------------------------
create or replace function public.create_order(
  p_buyer_name text, p_buyer_wa text, p_buyer_address text, p_items jsonb,
  p_buyer_nim text default null, p_buyer_prodi text default null, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guard      text;
  v_order_id   uuid;
  v_order_code text;
  v_item       jsonb;
  v_product    public.products%rowtype;
  v_variant    public.product_variants%rowtype;
  v_has_variant boolean;
  v_qty        integer;
  v_sum        integer;
  v_variant_id text;
  v_label      text;
  v_available  integer;
  v_price      integer;
  v_subtotal   integer;
  v_total      integer := 0;
  v_count      integer := 0;
  v_recent     integer;
  v_ip         text;
  v_uid        uuid;
  v_email      text;
  v_image      text;
  v_shared     boolean;
begin
  v_uid := auth.uid();
  if v_uid is null then
    return jsonb_build_object('error', 'Silakan masuk dulu untuk memesan.');
  end if;

  v_guard := public.spam_guard('pesan');
  if v_guard is not null then
    return jsonb_build_object('error', v_guard, 'blocked', true);
  end if;

  begin
    select email into v_email from auth.users where id = v_uid;

    if coalesce(trim(p_buyer_name), '') = '' then
      raise exception 'Nama pemesan wajib diisi.';
    end if;
    if coalesce(trim(p_buyer_address), '') = '' then
      raise exception 'Alamat pengiriman wajib diisi.';
    end if;
    if p_buyer_wa !~ '^[0-9]{9,15}$' then
      raise exception 'Nomor WhatsApp tidak valid.';
    end if;
    if p_items is null or jsonb_typeof(p_items) <> 'array'
       or jsonb_array_length(p_items) = 0 then
      raise exception 'Keranjang kosong.';
    end if;
    if jsonb_array_length(p_items) > 20 then
      raise exception 'Terlalu banyak jenis produk dalam satu pesanan.';
    end if;

    select count(*) into v_recent from public.orders
    where buyer_wa = p_buyer_wa and created_at > now() - interval '1 hour';
    if v_recent >= 5 then
      raise exception 'Terlalu banyak pesanan dari nomor ini. Coba lagi nanti.';
    end if;

    v_ip := public.client_ip_hash();
    if v_ip is not null then
      select count(*) into v_recent from public.orders
      where ip_hash = v_ip and created_at > now() - interval '1 hour';
      if v_recent >= 15 then
        raise exception 'Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti.';
      end if;
    end if;

    v_order_code := public.next_order_code();

    insert into public.orders (order_code, buyer_name, buyer_wa, buyer_nim,
                               buyer_prodi, buyer_address, notes, ip_hash,
                               user_id, buyer_email, pay_deadline)
    values (v_order_code, left(trim(p_buyer_name), 120), p_buyer_wa,
            nullif(left(trim(coalesce(p_buyer_nim, '')), 30), ''),
            nullif(left(trim(coalesce(p_buyer_prodi, '')), 80), ''),
            left(trim(p_buyer_address), 500),
            nullif(left(trim(coalesce(p_notes, '')), 500), ''),
            v_ip, v_uid, v_email, now() + interval '24 hours')
    returning id into v_order_id;

    for v_item in select * from jsonb_array_elements(p_items)
    loop
      v_qty := coalesce((v_item->>'qty')::integer, 0);
      v_variant_id := nullif(v_item->>'variant_id', '');
      v_shared := false;

      if v_qty <= 0 or v_qty > 99 then
        raise exception 'Jumlah tidak valid.';
      end if;

      select * into v_product from public.products
      where id = v_item->>'product_id' and is_active
      for update;
      if not found then
        raise exception 'Produk tidak ditemukan atau tidak aktif.';
      end if;

      -- Batas per pesanan dihitung dari semua baris produk yang sama.
      if v_product.max_per_order is not null then
        select coalesce(sum((x->>'qty')::integer), 0) into v_sum
        from jsonb_array_elements(p_items) x
        where x->>'product_id' = v_product.id;
        if v_sum > v_product.max_per_order then
          raise exception 'Maksimal % pcs % per pesanan.', v_product.max_per_order, v_product.name;
        end if;
      end if;

      if v_product.stock_type = 'pre_order'
         and (v_product.po_deadline is null or v_product.po_deadline < current_date) then
        raise exception 'Pre-order untuk % sudah ditutup.', v_product.name;
      end if;

      select exists (select 1 from public.product_variants where product_id = v_product.id)
      into v_has_variant;

      if v_has_variant then
        if v_variant_id is null then
          raise exception 'Pilih varian untuk %.', v_product.name;
        end if;
        select * into v_variant from public.product_variants
        where id = v_variant_id and product_id = v_product.id and is_active
        for update;
        if not found then
          raise exception 'Varian tidak ditemukan atau tidak aktif untuk %.', v_product.name;
        end if;

        v_price := coalesce(v_variant.price, v_product.price);
        v_label := v_variant.label;
        v_shared := v_product.stock_type = 'pre_order' and v_product.quota_mode = 'shared';

        if v_product.stock_type = 'ready_stock' then
          v_available := v_variant.stock - v_variant.stock_reserved;
        elsif v_shared then
          -- Sisa kuota gabungan dihitung langsung dari semua varian
          -- (baris produk sudah dikunci di atas, jadi aman dari balapan).
          select coalesce(v_product.po_quota, 0)
                 - coalesce(sum(coalesce(po_filled, 0) + coalesce(po_reserved, 0)), 0)
          into v_available
          from public.product_variants where product_id = v_product.id;
        else
          v_available := coalesce(v_variant.po_quota, 0)
                       - coalesce(v_variant.po_filled, 0)
                       - coalesce(v_variant.po_reserved, 0);
        end if;

        if v_qty > v_available then
          raise exception 'Stok % (%) tidak mencukupi (tersisa %).',
            v_product.name, v_label, greatest(v_available, 0);
        end if;

        if v_product.stock_type = 'ready_stock' then
          update public.product_variants set stock_reserved = stock_reserved + v_qty
          where id = v_variant.id;
        else
          update public.product_variants set po_reserved = coalesce(po_reserved, 0) + v_qty
          where id = v_variant.id;
          if v_shared then
            perform public.sync_shared_counters(v_product.id);
          end if;
        end if;

        v_image := nullif(v_variant.image, '');
      else
        declare v_variant_text text := nullif(v_item->>'variant', '');
        begin
          if v_product.variant_options is not null
             and array_length(v_product.variant_options, 1) > 0 then
            if v_variant_text is null or not (v_variant_text = any (v_product.variant_options)) then
              raise exception 'Varian tidak valid untuk %.', v_product.name;
            end if;
          end if;
          v_label := v_variant_text;
        end;

        v_price := v_product.price;

        if v_product.stock_type = 'ready_stock' then
          v_available := v_product.stock - v_product.stock_reserved;
        else
          v_available := coalesce(v_product.po_quota, 0)
                       - coalesce(v_product.po_filled, 0)
                       - coalesce(v_product.po_reserved, 0);
        end if;

        if v_qty > v_available then
          raise exception 'Stok % tidak mencukupi (tersisa %).', v_product.name, greatest(v_available, 0);
        end if;

        if v_product.stock_type = 'ready_stock' then
          update public.products set stock_reserved = stock_reserved + v_qty where id = v_product.id;
        else
          update public.products set po_reserved = coalesce(po_reserved, 0) + v_qty where id = v_product.id;
        end if;
        v_image := null;
      end if;

      if v_image is null then
        select pi.url into v_image from public.product_images pi
        where pi.product_id = v_product.id order by pi.order_index limit 1;
      end if;

      v_subtotal := v_price * v_qty;
      v_total := v_total + v_subtotal;
      v_count := v_count + v_qty;

      insert into public.order_items (order_id, product_id, product_name, product_slug,
                                      variant, variant_id, stock_type_snapshot, qty,
                                      unit_price, subtotal, image, shared_pool)
      values (v_order_id, v_product.id, v_product.name, v_product.slug,
              v_label, v_variant_id, v_product.stock_type, v_qty,
              v_price, v_subtotal, v_image, v_shared);
    end loop;

    update public.orders set total_amount = v_total, item_count = v_count where id = v_order_id;

    return jsonb_build_object(
      'order_code', v_order_code,
      'total_amount', v_total,
      'item_count', v_count
    );
  exception when others then
    -- Semua perubahan di blok ini dibatalkan (stok tidak tertahan).
    return jsonb_build_object('error', sqlerrm);
  end;
end;
$$;

-- ---------------------------------------------------------------------
-- Riwayat pembeli & cek kode: + foto, jam, batas bayar, pembatalan
-- ---------------------------------------------------------------------
create or replace function public.order_public_json(o public.orders)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'order_code', o.order_code,
    'total_amount', o.total_amount,
    'item_count', o.item_count,
    'amount_paid', o.amount_paid,
    'payment_status', o.payment_status,
    'order_status', o.order_status,
    'has_payment_proof', o.payment_proof_url is not null,
    'verified_at', o.verified_at,
    'created_at', o.created_at,
    'pay_deadline', o.pay_deadline,
    'received_at', o.received_at,
    'cancel_requested_at', o.cancel_requested_at,
    'cancel_request_reason', o.cancel_request_reason,
    'cancel_reject_note', o.cancel_reject_note,
    'cancelled_at', o.cancelled_at,
    'cancelled_by', o.cancelled_by,
    'cancel_reason', o.cancel_reason,
    'can_request_cancel',
      o.order_status in ('pending_verifikasi', 'terjual')
      and o.payment_status <> 'lunas'
      and o.received_at is null
      and o.cancel_requested_at is null,
    'can_hide', o.order_status in ('dibatalkan', 'kadaluarsa'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'product_slug', i.product_slug,
        'variant', i.variant,
        'stock_type_snapshot', i.stock_type_snapshot,
        'qty', i.qty,
        'unit_price', i.unit_price,
        'subtotal', i.subtotal,
        'image', i.image
      ) order by i.product_name, i.variant)
      from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  );
$$;
revoke all on function public.order_public_json(public.orders) from public, anon, authenticated;

create or replace function public.list_my_orders()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(
           public.order_public_json(o)
           || jsonb_build_object('buyer_name', o.buyer_name,
                                 'buyer_wa_masked', '•••• ' || right(o.buyer_wa, 4))
           order by o.created_at desc), '[]'::jsonb)
  from public.orders o
  where o.user_id = auth.uid() and not o.hidden_by_buyer;
$$;

-- Cek pesanan lewat kode juga dijaga anti-spam, supaya kode tidak bisa
-- ditebak beruntun oleh bot. Tidak ketemu = NULL; ditolak = {"error": ...}.
drop function if exists public.get_order_by_code(text);
create or replace function public.get_order_by_code(p_code text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_guard text;
  v_order public.orders%rowtype;
begin
  v_guard := public.spam_guard('cek-pesanan');
  if v_guard is not null then
    return jsonb_build_object('error', v_guard, 'blocked', true);
  end if;

  select * into v_order from public.orders
  where order_code = upper(trim(coalesce(p_code, '')))
  limit 1;
  if not found then
    return null;
  end if;

  return public.order_public_json(v_order)
    || jsonb_build_object(
         'buyer_name', split_part(v_order.buyer_name, ' ', 1) ||
           case when position(' ' in v_order.buyer_name) > 0 then ' •••' else '' end,
         'buyer_wa_masked', '•••• ' || right(v_order.buyer_wa, 4),
         -- Aksi hanya untuk pemilik yang sedang login.
         'can_request_cancel', (public.order_public_json(v_order)->>'can_request_cancel')::boolean
                               and v_order.user_id is not distinct from auth.uid()
                               and auth.uid() is not null,
         'can_hide', false);
end;
$$;

-- ---------------------------------------------------------------------
-- Aksi pembeli: ajukan / tarik pembatalan, hapus dari riwayat
-- ---------------------------------------------------------------------
create or replace function public.request_order_cancel(
  p_code text, p_reason text default null, p_withdraw boolean default false)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guard text;
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Silakan masuk dulu.');
  end if;
  v_guard := public.spam_guard('batal');
  if v_guard is not null then
    return jsonb_build_object('error', v_guard, 'blocked', true);
  end if;

  begin
    select * into v_order from public.orders
    where order_code = upper(trim(p_code)) and user_id = auth.uid()
    for update;
    if not found then
      raise exception 'Pesanan tidak ditemukan.';
    end if;

    if p_withdraw then
      if v_order.cancel_requested_at is null then
        raise exception 'Tidak ada pengajuan pembatalan.';
      end if;
      update public.orders
      set cancel_requested_at = null, cancel_request_reason = null
      where id = v_order.id;
      return jsonb_build_object('ok', true);
    end if;

    if v_order.order_status not in ('pending_verifikasi', 'terjual') then
      raise exception 'Pesanan ini sudah tidak aktif.';
    end if;
    if v_order.payment_status = 'lunas' then
      raise exception 'Pesanan yang sudah lunas tidak dapat dibatalkan.';
    end if;
    if v_order.received_at is not null then
      raise exception 'Barang sudah diterima, pesanan tidak dapat dibatalkan.';
    end if;
    if v_order.cancel_requested_at is not null then
      raise exception 'Pengajuan pembatalan sudah dikirim. Tunggu konfirmasi pengurus.';
    end if;

    update public.orders
    set cancel_requested_at = now(),
        cancel_request_reason = nullif(left(trim(coalesce(p_reason, '')), 300), ''),
        cancel_reject_note = null
    where id = v_order.id;
    return jsonb_build_object('ok', true);
  exception when others then
    return jsonb_build_object('error', sqlerrm);
  end;
end;
$$;

create or replace function public.hide_my_order(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_guard text;
  v_order public.orders%rowtype;
begin
  if auth.uid() is null then
    return jsonb_build_object('error', 'Silakan masuk dulu.');
  end if;
  v_guard := public.spam_guard('hapus-riwayat');
  if v_guard is not null then
    return jsonb_build_object('error', v_guard, 'blocked', true);
  end if;

  select * into v_order from public.orders
  where order_code = upper(trim(p_code)) and user_id = auth.uid();
  if not found then
    return jsonb_build_object('error', 'Pesanan tidak ditemukan.');
  end if;
  if v_order.order_status not in ('dibatalkan', 'kadaluarsa') then
    return jsonb_build_object('error', 'Hanya pesanan yang dibatalkan yang bisa dihapus dari riwayat.');
  end if;

  update public.orders set hidden_by_buyer = true where id = v_order.id;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Aksi pengurus (menu Pesanan)
-- ---------------------------------------------------------------------
create or replace function public.staff_actor_name()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select coalesce(nullif(p.display_name, ''), s.full_name, s.email)
     from public.staff s left join public.profiles p on p.id = s.id
     where s.id = auth.uid()),
    'Pengurus');
$$;
revoke all on function public.staff_actor_name() from public, anon, authenticated;

drop function if exists public.set_order_status(text, text, text);

create or replace function public.admin_order_action(
  p_code text, p_action text, p_note text default null, p_amount integer default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_actor text;
  v_note  text := nullif(trim(coalesce(p_note, '')), '');
begin
  if not public.has_section('pesanan') then
    raise exception 'Akunmu tidak punya izin menu Pesanan.' using errcode = '42501';
  end if;

  select * into v_order from public.orders
  where order_code = upper(trim(p_code))
  for update;
  if not found then
    raise exception 'Pesanan tidak ditemukan.' using errcode = '22023';
  end if;
  v_actor := public.staff_actor_name();

  if p_action = 'confirm_paid' then
    if v_order.order_status not in ('pending_verifikasi', 'terjual') then
      raise exception 'Pesanan sudah dibatalkan. Minta pembeli memesan ulang.';
    end if;
    if v_order.order_status = 'pending_verifikasi' then
      perform public.apply_order_stock(v_order.id, 'commit');
    end if;
    update public.orders
    set order_status = 'terjual', payment_status = 'lunas',
        amount_paid = total_amount,
        verified_by = v_actor, verified_at = coalesce(verified_at, now()),
        cancel_requested_at = null, cancel_request_reason = null,
        cancel_reject_note = case when cancel_requested_at is not null
                                  then 'Pesanan sudah lunas, tidak dapat dibatalkan.'
                                  else cancel_reject_note end
    where id = v_order.id;

  elsif p_action = 'confirm_dp' then
    if v_order.order_status not in ('pending_verifikasi', 'terjual') then
      raise exception 'Pesanan sudah dibatalkan.';
    end if;
    if p_amount is null or p_amount <= 0 or p_amount >= v_order.total_amount then
      raise exception 'Nominal DP harus lebih dari 0 dan kurang dari total (%).', v_order.total_amount;
    end if;
    if v_order.order_status = 'pending_verifikasi' then
      perform public.apply_order_stock(v_order.id, 'commit');
    end if;
    update public.orders
    set order_status = 'terjual', payment_status = 'dp', amount_paid = p_amount,
        verified_by = v_actor, verified_at = coalesce(verified_at, now())
    where id = v_order.id;

  elsif p_action = 'mark_unpaid' then
    -- Koreksi / dana dikembalikan. Pesanan tetap terkonfirmasi.
    if v_order.order_status <> 'terjual' then
      raise exception 'Hanya pesanan terkonfirmasi yang bisa diubah status bayarnya.';
    end if;
    update public.orders set payment_status = 'belum_lunas', amount_paid = 0 where id = v_order.id;

  elsif p_action = 'undo_confirm' then
    if v_order.order_status <> 'terjual' then
      raise exception 'Pesanan ini belum dikonfirmasi.';
    end if;
    if v_order.received_at is not null then
      raise exception 'Batalkan tanda "diterima" dulu.';
    end if;
    perform public.apply_order_stock(v_order.id, 'rehold');
    update public.orders
    set order_status = 'pending_verifikasi', payment_status = 'belum_lunas',
        amount_paid = 0, verified_by = null, verified_at = null,
        pay_deadline = now() + interval '24 hours'
    where id = v_order.id;

  elsif p_action = 'received' then
    if v_order.order_status <> 'terjual' then
      raise exception 'Konfirmasi pembayaran dulu sebelum menandai barang diterima.';
    end if;
    update public.orders set received_at = now(), received_by = v_actor where id = v_order.id;

  elsif p_action = 'unreceived' then
    update public.orders set received_at = null, received_by = null where id = v_order.id;

  elsif p_action = 'extend' then
    if v_order.order_status <> 'pending_verifikasi' then
      raise exception 'Hanya pesanan yang menunggu pembayaran yang bisa diperpanjang.';
    end if;
    update public.orders
    set pay_deadline = greatest(pay_deadline, now()) + interval '24 hours'
    where id = v_order.id;

  elsif p_action in ('cancel', 'approve_cancel') then
    if v_order.order_status not in ('pending_verifikasi', 'terjual') then
      raise exception 'Pesanan ini sudah tidak aktif.';
    end if;
    if v_order.payment_status = 'lunas' then
      raise exception 'Pesanan lunas tidak dapat dibatalkan. Bila dana dikembalikan, ubah status bayar ke "Belum bayar" dulu.';
    end if;
    if v_order.received_at is not null then
      raise exception 'Barang sudah diterima. Batalkan tanda "diterima" dulu.';
    end if;
    if v_order.order_status = 'pending_verifikasi' then
      perform public.apply_order_stock(v_order.id, 'release');
    else
      perform public.apply_order_stock(v_order.id, 'rehold');
      perform public.apply_order_stock(v_order.id, 'release');
    end if;
    update public.orders
    set order_status = 'dibatalkan',
        cancelled_at = now(), cancelled_by = v_actor,
        cancel_reason = left(coalesce(v_note,
          case when v_order.cancel_requested_at is not null
               then 'Pembatalan atas permintaan pembeli.'
               else 'Dibatalkan pengurus.' end), 300)
    where id = v_order.id;

  elsif p_action = 'reject_cancel' then
    if v_order.cancel_requested_at is null then
      raise exception 'Tidak ada pengajuan pembatalan.';
    end if;
    update public.orders
    set cancel_requested_at = null, cancel_request_reason = null,
        cancel_reject_note = left(coalesce(v_note, 'Pengajuan pembatalan ditolak pengurus.'), 300)
    where id = v_order.id;

  elsif p_action = 'note' then
    update public.orders set admin_note = left(v_note, 1000) where id = v_order.id;

  elsif p_action = 'delete' then
    if v_order.order_status not in ('dibatalkan', 'kadaluarsa') then
      raise exception 'Hanya pesanan yang dibatalkan yang bisa dihapus. Batalkan dulu.';
    end if;
    delete from public.orders where id = v_order.id;
    return jsonb_build_object('ok', true, 'deleted', true, 'proof', v_order.payment_proof_url);

  else
    raise exception 'Aksi tidak dikenal: %', p_action using errcode = '22023';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

/* Hapus semua pesanan batal/kedaluwarsa sekaligus. Mengembalikan jumlah
   dan path bukti bayar supaya klien bisa membersihkan storage. */
create or replace function public.admin_purge_cancelled_orders()
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_proofs jsonb;
  v_count  integer;
begin
  if not public.has_section('pesanan') then
    raise exception 'Akunmu tidak punya izin menu Pesanan.' using errcode = '42501';
  end if;
  select coalesce(jsonb_agg(payment_proof_url) filter (where payment_proof_url is not null), '[]'::jsonb),
         count(*)
  into v_proofs, v_count
  from public.orders where order_status in ('dibatalkan', 'kadaluarsa');

  delete from public.orders where order_status in ('dibatalkan', 'kadaluarsa');
  return jsonb_build_object('ok', true, 'count', v_count, 'proofs', v_proofs);
end;
$$;

-- ---------------------------------------------------------------------
-- Batal otomatis: belum dibayar sampai pay_deadline (24 jam)
-- ---------------------------------------------------------------------
create or replace function public.expire_stale_orders(p_hours integer default 24)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  o record;
  n integer := 0;
begin
  for o in
    select id from public.orders
    where order_status = 'pending_verifikasi'
      and payment_status = 'belum_lunas'
      and pay_deadline < now()
    for update skip locked
  loop
    perform public.apply_order_stock(o.id, 'release');
    update public.orders
    set order_status = 'kadaluarsa',
        cancelled_at = now(), cancelled_by = 'Sistem',
        cancel_reason = 'Otomatis dibatalkan: belum dibayar dalam 24 jam.'
    where id = o.id;
    n := n + 1;
  end loop;
  return n;
end;
$$;

select cron.schedule('expire-stale-orders', '*/5 * * * *', 'select public.expire_stale_orders(24)');

-- ---------------------------------------------------------------------
-- Blokir: daftar & buka (khusus admin)
-- ---------------------------------------------------------------------
create or replace function public.admin_list_bans()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Khusus admin.' using errcode = '42501';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', b.id,
      'label', b.label,
      'kind', case when b.user_id is not null then 'akun' else 'jaringan' end,
      'email', u.email,
      'reason', b.reason,
      'banned_until', b.banned_until,
      'created_at', b.created_at,
      'created_by', b.created_by,
      'lifted_at', b.lifted_at,
      'lifted_by', b.lifted_by,
      'active', b.lifted_at is null and b.banned_until > now()
    ) order by b.created_at desc)
    from (select * from public.bans order by created_at desc limit 300) b
    left join auth.users u on u.id = b.user_id
  ), '[]'::jsonb);
end;
$$;

create or replace function public.admin_unban(p_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_ban public.bans%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Khusus admin.' using errcode = '42501';
  end if;
  select * into v_ban from public.bans where id = p_id for update;
  if not found then
    raise exception 'Data blokir tidak ditemukan.';
  end if;
  update public.bans set lifted_at = now(), lifted_by = public.staff_actor_name()
  where id = p_id and lifted_at is null;
  delete from public.rate_guard
  where subject = case when v_ban.user_id is not null then 'u:' || v_ban.user_id::text
                       else 'ip:' || v_ban.ip_hash end;
  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Simpan varian: + biaya tambahan per pilihan, sinkron kuota gabungan
-- ---------------------------------------------------------------------
create or replace function public.admin_save_product_variants(
  p_product_id text, p_attributes jsonb, p_variants jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_attr jsonb;
  v_var  jsonb;
  v_opt  text;
  v_id   text;
  v_idx  integer;
begin
  if not public.has_section('produk') then
    raise exception 'Akunmu tidak punya izin menu Produk.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.products where id = p_product_id) then
    raise exception 'Produk tidak ditemukan.' using errcode = '22023';
  end if;

  delete from public.product_attributes where product_id = p_product_id;
  v_idx := 0;
  for v_attr in select * from jsonb_array_elements(coalesce(p_attributes, '[]'::jsonb))
  loop
    insert into public.product_attributes (id, product_id, name, order_index, price_adjustments)
    values (p_product_id || '-attr-' || v_idx, p_product_id,
            left(trim(v_attr ->> 'name'), 40), v_idx,
            case when jsonb_typeof(v_attr -> 'adjustments') = 'object'
                 then v_attr -> 'adjustments' else '{}'::jsonb end);
    v_idx := v_idx + 1;
  end loop;

  delete from public.product_variants
  where product_id = p_product_id
    and id <> all (
      select coalesce(x ->> 'id', '') from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb)) x
    );

  v_idx := 0;
  for v_var in select * from jsonb_array_elements(coalesce(p_variants, '[]'::jsonb))
  loop
    v_id := coalesce(v_var ->> 'id', p_product_id || '-var-' || gen_random_uuid()::text);

    insert into public.product_variants (
      id, product_id, label, sku, price, stock, stock_reserved,
      po_quota, po_filled, po_reserved, image, is_active, order_index
    )
    values (
      v_id, p_product_id,
      left(trim(v_var ->> 'label'), 80),
      nullif(trim(coalesce(v_var ->> 'sku', '')), ''),
      (v_var ->> 'price')::integer,
      coalesce((v_var ->> 'stock')::integer, 0),
      coalesce((v_var ->> 'stock_reserved')::integer, 0),
      (v_var ->> 'po_quota')::integer,
      coalesce((v_var ->> 'po_filled')::integer, 0),
      coalesce((v_var ->> 'po_reserved')::integer, 0),
      nullif(trim(coalesce(v_var ->> 'image', '')), ''),
      coalesce((v_var ->> 'is_active')::boolean, true),
      v_idx
    )
    on conflict (id) do update set
      label = excluded.label,
      sku = excluded.sku,
      price = excluded.price,
      stock = excluded.stock,
      -- stock_reserved / po_filled / po_reserved sengaja tidak ditimpa:
      -- penghitung itu milik pesanan, bukan form.
      po_quota = excluded.po_quota,
      image = excluded.image,
      is_active = excluded.is_active,
      order_index = excluded.order_index;

    delete from public.product_variant_options where variant_id = v_id;
    for v_opt in select jsonb_object_keys(coalesce(v_var -> 'options', '{}'::jsonb))
    loop
      insert into public.product_variant_options (variant_id, attribute_name, value)
      values (v_id, v_opt, (v_var -> 'options') ->> v_opt);
    end loop;

    v_idx := v_idx + 1;
  end loop;

  perform public.sync_shared_counters(p_product_id);

  return jsonb_build_object('ok', true);
end;
$$;

-- ---------------------------------------------------------------------
-- Hak akses fungsi
-- ---------------------------------------------------------------------
revoke all on function public.spam_guard(text) from public, anon, authenticated;
revoke all on function public.expire_stale_orders(integer) from public, anon, authenticated;
revoke all on function public.apply_order_stock(uuid, text) from public, anon, authenticated;
revoke all on function public.sync_shared_counters(text) from public, anon, authenticated;

revoke all on function public.request_order_cancel(text, text, boolean) from public, anon;
grant execute on function public.request_order_cancel(text, text, boolean) to authenticated;
revoke all on function public.hide_my_order(text) from public, anon;
grant execute on function public.hide_my_order(text) to authenticated;

revoke all on function public.admin_order_action(text, text, text, integer) from public, anon;
grant execute on function public.admin_order_action(text, text, text, integer) to authenticated;
revoke all on function public.admin_purge_cancelled_orders() from public, anon;
grant execute on function public.admin_purge_cancelled_orders() to authenticated;
revoke all on function public.admin_list_bans() from public, anon;
grant execute on function public.admin_list_bans() to authenticated;
revoke all on function public.admin_unban(uuid) from public, anon;
grant execute on function public.admin_unban(uuid) to authenticated;

grant execute on function public.create_order(text, text, text, jsonb, text, text, text) to anon, authenticated;
grant execute on function public.list_my_orders() to authenticated;
grant execute on function public.get_order_by_code(text) to anon, authenticated;

commit;
