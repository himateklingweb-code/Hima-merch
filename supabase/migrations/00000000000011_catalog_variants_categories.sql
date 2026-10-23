-- ============================================================================
-- 0011 — Kategori berita dinamis, galeri gambar dengan rasio asli, dan
--        varian produk multi-atribut (warna, ukuran, lengan, dst).
--
-- Sebelumnya:
--   * Kategori berita: dropdown tetap 5 pilihan, dikunci di kode.
--   * Produk: satu foto tunggal (placeholder), satu varian flat ("Ukuran").
--   * Rasio gambar berita/produk dipaksa 16:10 / 4:3 di tampilan.
--
-- Sekarang:
--   * content_categories — pengurus dengan izin menu Berita bisa menambah
--     kategori baru sendiri dari panel; dropdown mengikuti tabel ini.
--   * articles — kolom tags[], is_pinned (sorot di beranda), image_width/
--     image_height (lebar/tinggi asli foto, dipakai tampilan untuk rasio).
--   * product_images — galeri banyak foto per produk, masing-masing dengan
--     lebar/tinggi asli sendiri.
--   * product_variants + product_variant_options — satu produk bisa punya
--     banyak atribut (Warna, Ukuran, Lengan, dst), tiap kombinasi punya
--     stok/kuota PO sendiri. Produk tanpa varian tetap pakai kolom stok
--     lama di products — tidak ada data lama yang perlu dipindah.
--
-- Idempoten: aman dijalankan ulang.
-- ============================================================================


-- 1. Kategori berita, dikelola pengurus --------------------------------------
create table if not exists public.content_categories (
  id          text primary key,
  name        text not null unique,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

alter table public.content_categories enable row level security;
drop policy if exists "public reads categories" on public.content_categories;
create policy "public reads categories" on public.content_categories
  for select to anon, authenticated using (true);
drop policy if exists "berita writes categories" on public.content_categories;
create policy "berita writes categories" on public.content_categories
  for insert to authenticated with check (public.has_section('berita'));
drop policy if exists "berita updates categories" on public.content_categories;
create policy "berita updates categories" on public.content_categories
  for update to authenticated
  using (public.has_section('berita')) with check (public.has_section('berita'));
drop policy if exists "berita deletes categories" on public.content_categories;
create policy "berita deletes categories" on public.content_categories
  for delete to authenticated using (public.has_section('berita'));
revoke all on public.content_categories from anon;
grant select on public.content_categories to anon, authenticated;
grant insert, update, delete on public.content_categories to authenticated;

insert into public.content_categories (id, name, order_index) values
  ('cat-kegiatan', 'Kegiatan', 0),
  ('cat-seminar', 'Seminar', 1),
  ('cat-merchandise', 'Merchandise', 2),
  ('cat-prestasi', 'Prestasi', 3),
  ('cat-pengumuman', 'Pengumuman', 4)
on conflict (id) do nothing;


-- 2. Berita: tag, sorotan, dan dimensi foto asli -----------------------------
alter table public.articles
  add column if not exists tags text[] not null default '{}',
  add column if not exists is_pinned boolean not null default false,
  add column if not exists image_width integer,
  add column if not exists image_height integer;

create index if not exists articles_pinned_idx
  on public.articles (is_pinned, published_at desc);


-- 3. Galeri gambar produk, satu baris per foto -------------------------------
create table if not exists public.product_images (
  id          text primary key,
  product_id  text not null references public.products (id) on delete cascade,
  url         text not null,
  alt_text    text not null default '',
  width       integer,
  height      integer,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists product_images_product_idx
  on public.product_images (product_id, order_index);

alter table public.product_images enable row level security;
drop policy if exists "public reads images of visible products" on public.product_images;
create policy "public reads images of visible products" on public.product_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_images.product_id
        and (p.is_active or public.has_section('produk'))
    )
  );
drop policy if exists "produk writes images" on public.product_images;
create policy "produk writes images" on public.product_images
  for insert to authenticated with check (public.has_section('produk'));
drop policy if exists "produk updates images" on public.product_images;
create policy "produk updates images" on public.product_images
  for update to authenticated
  using (public.has_section('produk')) with check (public.has_section('produk'));
drop policy if exists "produk deletes images" on public.product_images;
create policy "produk deletes images" on public.product_images
  for delete to authenticated using (public.has_section('produk'));
revoke all on public.product_images from anon;
grant select on public.product_images to anon, authenticated;
grant insert, update, delete on public.product_images to authenticated;


-- 4. Atribut + varian produk --------------------------------------------------
-- Atribut: nama sumbu varian untuk satu produk (Warna, Ukuran, Lengan, ...).
create table if not exists public.product_attributes (
  id          text primary key,
  product_id  text not null references public.products (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 40),
  order_index integer not null default 0
);
create index if not exists product_attributes_product_idx
  on public.product_attributes (product_id, order_index);

-- Varian: satu kombinasi nilai atribut, dengan stok/kuota sendiri.
-- stock_type mengikuti products.stock_type milik produk induknya — tidak
-- diulang di sini supaya tidak bisa berbeda per varian secara tidak sengaja.
create table if not exists public.product_variants (
  id             text primary key,
  product_id     text not null references public.products (id) on delete cascade,
  label          text not null check (char_length(trim(label)) between 1 and 80),
  sku            text,
  price          integer check (price is null or price >= 0),
  stock          integer not null default 0 check (stock >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0),
  po_quota       integer check (po_quota is null or po_quota >= 0),
  po_filled      integer not null default 0 check (po_filled >= 0),
  po_reserved    integer not null default 0 check (po_reserved >= 0),
  image          text,
  is_active      boolean not null default true,
  order_index    integer not null default 0,
  created_at     timestamptz not null default now()
);
create index if not exists product_variants_product_idx
  on public.product_variants (product_id, order_index);

-- Nilai atribut untuk satu varian, misalnya ('Warna','Hitam') + ('Ukuran','L').
create table if not exists public.product_variant_options (
  variant_id     text not null references public.product_variants (id) on delete cascade,
  attribute_name text not null,
  value          text not null,
  primary key (variant_id, attribute_name)
);

alter table public.product_attributes      enable row level security;
alter table public.product_variants        enable row level security;
alter table public.product_variant_options enable row level security;

drop policy if exists "public reads attributes of visible products" on public.product_attributes;
create policy "public reads attributes of visible products" on public.product_attributes
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_attributes.product_id
        and (p.is_active or public.has_section('produk'))
    )
  );
drop policy if exists "produk writes attributes" on public.product_attributes;
create policy "produk writes attributes" on public.product_attributes
  for insert to authenticated with check (public.has_section('produk'));
drop policy if exists "produk updates attributes" on public.product_attributes;
create policy "produk updates attributes" on public.product_attributes
  for update to authenticated
  using (public.has_section('produk')) with check (public.has_section('produk'));
drop policy if exists "produk deletes attributes" on public.product_attributes;
create policy "produk deletes attributes" on public.product_attributes
  for delete to authenticated using (public.has_section('produk'));
revoke all on public.product_attributes from anon;
grant select on public.product_attributes to anon, authenticated;
grant insert, update, delete on public.product_attributes to authenticated;

drop policy if exists "public reads variants of visible products" on public.product_variants;
create policy "public reads variants of visible products" on public.product_variants
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.products p
      where p.id = product_variants.product_id
        and (p.is_active or public.has_section('produk'))
    )
  );
drop policy if exists "produk writes variants" on public.product_variants;
create policy "produk writes variants" on public.product_variants
  for insert to authenticated with check (public.has_section('produk'));
drop policy if exists "produk updates variants" on public.product_variants;
create policy "produk updates variants" on public.product_variants
  for update to authenticated
  using (public.has_section('produk')) with check (public.has_section('produk'));
drop policy if exists "produk deletes variants" on public.product_variants;
create policy "produk deletes variants" on public.product_variants
  for delete to authenticated using (public.has_section('produk'));
-- create_order() dan apply_order_stock() menulis stok varian lewat
-- SECURITY DEFINER, jadi RLS di atas tidak perlu mengizinkan anon menulis.
revoke all on public.product_variants from anon;
grant select on public.product_variants to anon, authenticated;
grant insert, update, delete on public.product_variants to authenticated;

drop policy if exists "public reads variant options of visible products" on public.product_variant_options;
create policy "public reads variant options of visible products" on public.product_variant_options
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.product_variants v
      join public.products p on p.id = v.product_id
      where v.id = product_variant_options.variant_id
        and (p.is_active or public.has_section('produk'))
    )
  );
drop policy if exists "produk writes variant options" on public.product_variant_options;
create policy "produk writes variant options" on public.product_variant_options
  for insert to authenticated with check (public.has_section('produk'));
drop policy if exists "produk updates variant options" on public.product_variant_options;
create policy "produk updates variant options" on public.product_variant_options
  for update to authenticated
  using (public.has_section('produk')) with check (public.has_section('produk'));
drop policy if exists "produk deletes variant options" on public.product_variant_options;
create policy "produk deletes variant options" on public.product_variant_options
  for delete to authenticated using (public.has_section('produk'));
revoke all on public.product_variant_options from anon;
grant select on public.product_variant_options to anon, authenticated;
grant insert, update, delete on public.product_variant_options to authenticated;

-- Ganti seluruh katalog varian satu produk dalam satu panggilan, supaya
-- form admin tidak perlu banyak roundtrip dan tidak bisa menyisakan baris
-- yatim ketika sebagian gagal di tengah jalan.
create or replace function public.admin_save_product_variants(
  p_product_id text,
  p_attributes jsonb,  -- [{"name":"Warna"}, {"name":"Ukuran"}]
  p_variants   jsonb   -- [{"id":...,"label":...,"price":...,"stock":...,
                        --   "stock_reserved":...,"po_quota":...,"po_filled":...,
                        --   "po_reserved":...,"image":...,"is_active":...,
                        --   "order_index":...,"options":{"Warna":"Hitam",...}}]
)
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
    insert into public.product_attributes (id, product_id, name, order_index)
    values (p_product_id || '-attr-' || v_idx, p_product_id,
            left(trim(v_attr ->> 'name'), 40), v_idx);
    v_idx := v_idx + 1;
  end loop;

  -- Varian yang tidak lagi disertakan dihapus; sisanya upsert.
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
      -- stock_reserved sengaja TIDAK ditimpa dari form: pesanan yang sedang
      -- menahan stok tidak boleh hilang hanya karena admin menyimpan ulang.
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

  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.admin_save_product_variants(text, jsonb, jsonb) from public, anon;
grant execute on function public.admin_save_product_variants(text, jsonb, jsonb) to authenticated;


-- 5. Pesanan: pesanan sekarang bisa menunjuk satu varian spesifik ------------
alter table public.order_items
  add column if not exists variant_id text references public.product_variants (id);

-- apply_order_stock harus tahu menggerakkan stok di products atau di
-- product_variants, mengikuti apakah baris pesanan itu menunjuk varian.
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
    elsif it.stock_type_snapshot = 'ready_stock' then
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
  end loop;
end;
$$;

-- create_order: kalau item menunjuk varian, harga/stok/kuota dibaca dari
-- varian itu (bukan dari produk), dan label varian disalin ke kolom
-- `variant` lama supaya tampilan pesanan lama tidak perlu berubah.
-- Tanda tangan dan pengecekan rate-limit/login di bawah mengikuti versi
-- yang sudah berjalan di database live (auth.uid() wajib, client_ip_hash,
-- user_id, buyer_email) — bagian baru di sini hanya dukungan varian.
create or replace function public.create_order(
  p_buyer_name    text,
  p_buyer_wa      text,
  p_buyer_address text,
  p_items         jsonb,
  p_buyer_nim     text default null,
  p_buyer_prodi   text default null,
  p_notes         text default null
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_order_id   uuid;
  v_order_code text;
  v_item       jsonb;
  v_product    public.products%rowtype;
  v_variant    public.product_variants%rowtype;
  v_has_variant boolean;
  v_qty        integer;
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
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Silakan masuk dulu untuk memesan.' using errcode = '42501';
  end if;
  select email into v_email from auth.users where id = v_uid;

  if coalesce(trim(p_buyer_name), '') = '' then
    raise exception 'Nama pemesan wajib diisi.' using errcode = '22023';
  end if;
  if coalesce(trim(p_buyer_address), '') = '' then
    raise exception 'Alamat pengiriman wajib diisi.' using errcode = '22023';
  end if;
  if p_buyer_wa !~ '^[0-9]{9,15}$' then
    raise exception 'Nomor WhatsApp tidak valid.' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array'
     or jsonb_array_length(p_items) = 0 then
    raise exception 'Keranjang kosong.' using errcode = '22023';
  end if;
  if jsonb_array_length(p_items) > 20 then
    raise exception 'Terlalu banyak jenis produk dalam satu pesanan.'
      using errcode = '22023';
  end if;

  select count(*) into v_recent
  from public.orders
  where buyer_wa = p_buyer_wa
    and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'Terlalu banyak pesanan dari nomor ini. Coba lagi nanti.'
      using errcode = '53400';
  end if;

  v_ip := public.client_ip_hash();
  if v_ip is not null then
    select count(*) into v_recent
    from public.orders
    where ip_hash = v_ip
      and created_at > now() - interval '1 hour';
    if v_recent >= 15 then
      raise exception 'Terlalu banyak pesanan dari jaringan ini. Coba lagi nanti.'
        using errcode = '53400';
    end if;
  end if;

  v_order_code := public.next_order_code();

  insert into public.orders (order_code, buyer_name, buyer_wa, buyer_nim,
                             buyer_prodi, buyer_address, notes, ip_hash,
                             user_id, buyer_email)
  values (v_order_code, trim(p_buyer_name), p_buyer_wa,
          nullif(trim(coalesce(p_buyer_nim, '')), ''),
          nullif(trim(coalesce(p_buyer_prodi, '')), ''),
          trim(p_buyer_address),
          nullif(trim(coalesce(p_notes, '')), ''),
          v_ip, v_uid, v_email)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'qty')::integer, 0);
    v_variant_id := nullif(v_item->>'variant_id', '');

    if v_qty <= 0 or v_qty > 99 then
      raise exception 'Jumlah tidak valid.' using errcode = '22023';
    end if;

    select * into v_product
    from public.products
    where id = v_item->>'product_id' and is_active;

    if not found then
      raise exception 'Produk tidak ditemukan atau tidak aktif: %',
        v_item->>'product_id' using errcode = '22023';
    end if;

    select exists (
      select 1 from public.product_variants where product_id = v_product.id
    ) into v_has_variant;

    if v_has_variant then
      if v_variant_id is null then
        raise exception 'Pilih varian untuk %.', v_product.name
          using errcode = '22023';
      end if;
      select * into v_variant
      from public.product_variants
      where id = v_variant_id and product_id = v_product.id and is_active;
      if not found then
        raise exception 'Varian tidak ditemukan atau tidak aktif untuk %.', v_product.name
          using errcode = '22023';
      end if;

      v_price := coalesce(v_variant.price, v_product.price);
      v_label := v_variant.label;

      if v_product.stock_type = 'ready_stock' then
        v_available := v_variant.stock - v_variant.stock_reserved;
      else
        if v_product.po_deadline is null or v_product.po_deadline < current_date then
          raise exception 'Pre-order untuk % sudah ditutup.', v_product.name
            using errcode = '22023';
        end if;
        v_available := coalesce(v_variant.po_quota, 0)
                     - coalesce(v_variant.po_filled, 0)
                     - coalesce(v_variant.po_reserved, 0);
      end if;

      if v_qty > v_available then
        raise exception 'Stok % (%) tidak mencukupi (tersisa %).',
          v_product.name, v_label, v_available using errcode = '22023';
      end if;

      if v_product.stock_type = 'ready_stock' then
        update public.product_variants set stock_reserved = stock_reserved + v_qty
        where id = v_variant.id;
      else
        update public.product_variants set po_reserved = coalesce(po_reserved, 0) + v_qty
        where id = v_variant.id;
      end if;
    else
      -- Produk tanpa varian: jalur lama, satu varian teks bebas dari
      -- products.variant_options (atau tanpa varian sama sekali).
      declare v_variant_text text := nullif(v_item->>'variant', '');
      begin
        if v_product.variant_options is not null
           and array_length(v_product.variant_options, 1) > 0 then
          if v_variant_text is null or not (v_variant_text = any (v_product.variant_options)) then
            raise exception 'Varian tidak valid untuk %', v_product.name
              using errcode = '22023';
          end if;
        end if;
        v_label := v_variant_text;
      end;

      v_price := v_product.price;

      if v_product.stock_type = 'ready_stock' then
        v_available := v_product.stock - v_product.stock_reserved;
      else
        if v_product.po_deadline is null or v_product.po_deadline < current_date then
          raise exception 'Pre-order untuk % sudah ditutup.', v_product.name
            using errcode = '22023';
        end if;
        v_available := coalesce(v_product.po_quota, 0)
                     - coalesce(v_product.po_filled, 0)
                     - coalesce(v_product.po_reserved, 0);
      end if;

      if v_qty > v_available then
        raise exception 'Stok % tidak mencukupi (tersisa %).',
          v_product.name, v_available using errcode = '22023';
      end if;

      if v_product.stock_type = 'ready_stock' then
        update public.products set stock_reserved = stock_reserved + v_qty
        where id = v_product.id;
      else
        update public.products set po_reserved = coalesce(po_reserved, 0) + v_qty
        where id = v_product.id;
      end if;
    end if;

    v_subtotal := v_price * v_qty;
    v_total := v_total + v_subtotal;
    v_count := v_count + v_qty;

    insert into public.order_items (order_id, product_id, product_name,
                                    product_slug, variant, variant_id,
                                    stock_type_snapshot, qty, unit_price, subtotal)
    values (v_order_id, v_product.id, v_product.name, v_product.slug,
            v_label, v_variant_id, v_product.stock_type, v_qty, v_price, v_subtotal);
  end loop;

  update public.orders
  set total_amount = v_total, item_count = v_count
  where id = v_order_id;

  return jsonb_build_object(
    'order_code', v_order_code,
    'total_amount', v_total,
    'item_count', v_count
  );
end;
$$;

revoke all on function public.create_order(text, text, text, jsonb, text, text, text)
  from public;
grant execute on function public.create_order(text, text, text, jsonb, text, text, text)
  to anon, authenticated;
