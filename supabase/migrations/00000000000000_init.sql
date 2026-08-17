-- ============================================================
-- HIMA TL UNTAN — full schema
--
-- This is the consolidated state of the live database. Run it once against
-- a fresh Supabase project (SQL Editor, or `supabase db push`) to reproduce
-- the whole setup.
--
-- The shape to understand before changing anything: buyers never touch the
-- order tables directly. They call create_order(), which prices the basket
-- from the catalogue, and get_order_by_code(), which returns a masked
-- receipt. Only signed-in staff can read orders.
-- ============================================================

-- ============================================================
-- Tables
-- ============================================================

-- Who may see orders. Keyed to a Supabase Auth user so RLS can ask "is the
-- caller staff?" rather than trusting anything sent by the client.
create table if not exists public.staff (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  full_name  text,
  role       text not null default 'kasir' check (role in ('kasir', 'admin')),
  created_at timestamptz not null default now()
);

comment on table public.staff is
  'HIMA TL committee members with dashboard access. Insert a row here after
   creating the Auth user; without it the account signs in but sees nothing.';

-- The catalogue is the source of truth for price and stock. Checkout reads
-- from here rather than believing the browser.
create table if not exists public.products (
  id              text primary key,
  name            text not null,
  slug            text unique not null,
  description     text not null default '',
  price           integer not null check (price >= 0),
  stock_type      text not null check (stock_type in ('ready_stock', 'pre_order')),
  stock           integer not null default 0 check (stock >= 0),
  stock_reserved  integer not null default 0 check (stock_reserved >= 0),
  variant_name    text,
  variant_options text[],
  po_quota        integer,
  po_filled       integer default 0,
  po_reserved     integer default 0,
  po_deadline     date,
  is_active       boolean not null default true,
  seo             jsonb,
  created_at      timestamptz not null default now()
);

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_code     text unique not null,

  buyer_name     text not null,
  buyer_wa       text not null,
  buyer_nim      text,
  buyer_prodi    text,
  buyer_address  text not null,
  notes          text,

  total_amount   integer not null default 0,
  item_count     integer not null default 0,

  payment_status text not null default 'belum_lunas'
                 check (payment_status in ('belum_lunas', 'dp', 'lunas')),
  order_status   text not null default 'pending_verifikasi'
                 check (order_status in ('pending_verifikasi', 'terjual',
                                         'dibatalkan', 'kadaluarsa')),

  payment_proof_url text,
  verified_by    text,
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- Name and price are snapshotted at purchase time so later catalogue edits
-- never rewrite what someone already ordered.
create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,
  product_id          text not null references public.products(id),
  product_name        text not null,
  product_slug        text,
  variant             text,
  stock_type_snapshot text not null
                      check (stock_type_snapshot in ('ready_stock', 'pre_order')),
  qty                 integer not null check (qty > 0),
  unit_price          integer not null check (unit_price >= 0),
  subtotal            integer not null check (subtotal >= 0)
);

create index if not exists order_items_order_id_idx   on public.order_items(order_id);
-- Covering index for the product foreign key, so deleting or editing a
-- product does not have to scan order_items to check the constraint.
create index if not exists order_items_product_id_idx on public.order_items(product_id);
create index if not exists orders_order_code_idx      on public.orders(order_code);
create index if not exists orders_created_at_idx      on public.orders(created_at desc);
-- Backs the per-number rate limit lookup in create_order().
create index if not exists orders_buyer_wa_idx        on public.orders(buyer_wa, created_at desc);
-- No index on products.slug: `slug text unique` already creates one.

-- ============================================================
-- Helpers
-- ============================================================

-- STABLE so Postgres evaluates it once per statement, not once per row.
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.staff where id = auth.uid());
$$;

create sequence if not exists public.order_code_seq;

-- Sequential part keeps codes readable and ordered; the random suffix means
-- knowing one code tells you nothing about the next, so the public receipt
-- lookup cannot be walked.
create or replace function public.next_order_code()
returns text
language sql
volatile
security definer
set search_path = public, pg_temp
as $$
  select 'ORD-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.order_code_seq')::text, 4, '0') || '-' ||
         upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 6));
$$;

-- Neither belongs on the public REST surface.
revoke execute on function public.is_staff()        from public, anon, authenticated;
revoke execute on function public.next_order_code() from public, anon, authenticated;

-- ...but RLS policies are evaluated as the *querying* role, so any role
-- whose policies call is_staff() must be able to execute it. Staff-only
-- tables are queried by `authenticated`, so it gets the grant back. `anon`
-- deliberately does not: nothing anon can reach calls this, and granting it
-- would put it back on the public API.
grant execute on function public.is_staff() to authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.staff       enable row level security;
alter table public.products    enable row level security;
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- `(select auth.uid())` rather than `auth.uid()`: the scalar subquery is
-- evaluated once per statement instead of once per row.
drop policy if exists "staff read own row" on public.staff;
create policy "staff read own row"
  on public.staff for select to authenticated
  using (id = (select auth.uid()));

-- Products are split by role on purpose. The anon predicate must never
-- call is_staff(), because anon has no EXECUTE on it — doing so fails the
-- whole read and takes the storefront down. Separate roles also avoid the
-- cost of two permissive policies overlapping.
drop policy if exists "public reads active products" on public.products;
create policy "public reads active products"
  on public.products for select to anon
  using (is_active);

drop policy if exists "staff reads all products" on public.products;
create policy "staff reads all products"
  on public.products for select to authenticated
  using (is_active or public.is_staff());

drop policy if exists "staff insert products" on public.products;
create policy "staff insert products"
  on public.products for insert to authenticated
  with check (public.is_staff());

drop policy if exists "staff update products" on public.products;
create policy "staff update products"
  on public.products for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff delete products" on public.products;
create policy "staff delete products"
  on public.products for delete to authenticated
  using (public.is_staff());

-- No public select and no public insert on orders: a buyer never touches
-- these tables directly.
drop policy if exists "staff read orders" on public.orders;
create policy "staff read orders"
  on public.orders for select to authenticated
  using (public.is_staff());

drop policy if exists "staff update orders" on public.orders;
create policy "staff update orders"
  on public.orders for update to authenticated
  using (public.is_staff()) with check (public.is_staff());

drop policy if exists "staff read order items" on public.order_items;
create policy "staff read order items"
  on public.order_items for select to authenticated
  using (public.is_staff());

-- ============================================================
-- create_order — the only way an order gets written.
--
-- The caller sends product ids, variants and quantities. Prices, names and
-- stock limits are read from the catalogue here, so a tampered payload
-- cannot set its own price or oversell.
-- ============================================================
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
  v_qty        integer;
  v_variant    text;
  v_available  integer;
  v_subtotal   integer;
  v_total      integer := 0;
  v_count      integer := 0;
  v_recent     integer;
begin
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

  -- Rate limit: same number, same hour. Order creation is public, so this
  -- is what stops someone scripting thousands of rows.
  select count(*) into v_recent
  from public.orders
  where buyer_wa = p_buyer_wa
    and created_at > now() - interval '1 hour';

  if v_recent >= 5 then
    raise exception 'Terlalu banyak pesanan dari nomor ini. Coba lagi nanti.'
      using errcode = '53400';
  end if;

  v_order_code := public.next_order_code();

  insert into public.orders (order_code, buyer_name, buyer_wa, buyer_nim,
                             buyer_prodi, buyer_address, notes)
  values (v_order_code, trim(p_buyer_name), p_buyer_wa,
          nullif(trim(coalesce(p_buyer_nim, '')), ''),
          nullif(trim(coalesce(p_buyer_prodi, '')), ''),
          trim(p_buyer_address),
          nullif(trim(coalesce(p_notes, '')), ''))
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    v_qty := coalesce((v_item->>'qty')::integer, 0);
    v_variant := nullif(v_item->>'variant', '');

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

    if v_product.variant_options is not null
       and array_length(v_product.variant_options, 1) > 0 then
      if v_variant is null or not (v_variant = any (v_product.variant_options)) then
        raise exception 'Varian tidak valid untuk %', v_product.name
          using errcode = '22023';
      end if;
    end if;

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

    v_subtotal := v_product.price * v_qty;
    v_total := v_total + v_subtotal;
    v_count := v_count + v_qty;

    insert into public.order_items (order_id, product_id, product_name,
                                    product_slug, variant, stock_type_snapshot,
                                    qty, unit_price, subtotal)
    values (v_order_id, v_product.id, v_product.name, v_product.slug,
            v_variant, v_product.stock_type, v_qty, v_product.price, v_subtotal);

    -- Hold the stock until the cashier verifies or the order expires.
    if v_product.stock_type = 'ready_stock' then
      update public.products set stock_reserved = stock_reserved + v_qty
      where id = v_product.id;
    else
      update public.products set po_reserved = coalesce(po_reserved, 0) + v_qty
      where id = v_product.id;
    end if;
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

-- ============================================================
-- get_order_by_code — a buyer checking their own receipt.
--
-- Returns status and lines, but masks the name and number and omits the
-- address. A leaked code must not turn into someone's contact details.
-- ============================================================
create or replace function public.get_order_by_code(p_code text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'order_code', o.order_code,
    'buyer_name', split_part(o.buyer_name, ' ', 1) ||
                  case when position(' ' in o.buyer_name) > 0 then ' •••' else '' end,
    'buyer_wa_masked', '•••• ' || right(o.buyer_wa, 4),
    'total_amount', o.total_amount,
    'item_count', o.item_count,
    'payment_status', o.payment_status,
    'order_status', o.order_status,
    'verified_at', o.verified_at,
    'created_at', o.created_at,
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'product_name', i.product_name,
        'product_slug', i.product_slug,
        'variant', i.variant,
        'stock_type_snapshot', i.stock_type_snapshot,
        'qty', i.qty,
        'unit_price', i.unit_price,
        'subtotal', i.subtotal
      )) from public.order_items i where i.order_id = o.id
    ), '[]'::jsonb)
  )
  from public.orders o
  where o.order_code = upper(trim(p_code))
  limit 1;
$$;

revoke all on function public.get_order_by_code(text) from public;
grant execute on function public.get_order_by_code(text) to anon, authenticated;

-- ============================================================
-- Catalogue seed. ON CONFLICT so re-running never clobbers stock the
-- cashier has since adjusted.
-- ============================================================
insert into public.products
  (id, name, slug, description, price, stock_type, stock, stock_reserved,
   variant_name, variant_options, po_quota, po_filled, po_reserved, po_deadline)
values
  ('prod-1', 'Kaos HIMA TL UNTAN 2025', 'kaos-hima-tl-2025',
   'Kaos resmi HIMA Teknik Lingkungan UNTAN edisi 2025. Bahan cotton combed 30s, sablon DTF premium.',
   85000, 'ready_stock', 45, 3, 'Ukuran', ARRAY['S','M','L','XL','XXL'],
   null, null, null, null),
  ('prod-2', 'Jaket Almamater TL', 'jaket-almamater-tl',
   'Jaket almamater eksklusif Teknik Lingkungan UNTAN. Bahan parasut waterproof, bordir logo.',
   250000, 'pre_order', 0, 0, 'Ukuran', ARRAY['S','M','L','XL'],
   50, 24, 5, '2026-09-15'),
  ('prod-3', 'Tote Bag HIMA TL', 'tote-bag-hima-tl',
   'Tote bag kanvas tebal dengan desain eksklusif HIMA TL UNTAN.',
   45000, 'ready_stock', 0, 0, null, null, null, null, null, null),
  ('prod-4', 'Sticker Pack Enviro', 'sticker-pack-enviro',
   'Paket stiker bertema lingkungan hidup, berisi 10 lembar stiker vinyl tahan air.',
   15000, 'ready_stock', 120, 0, null, null, null, null, null, null),
  ('prod-5', 'Hoodie Green Engineering', 'hoodie-green-engineering',
   'Hoodie premium bertema Green Engineering. Bahan fleece tebal.',
   195000, 'pre_order', 0, 0, 'Ukuran', ARRAY['M','L','XL','XXL'],
   40, 38, 2, '2026-08-10')
on conflict (id) do nothing;
