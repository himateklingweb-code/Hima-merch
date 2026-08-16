-- ============================================================
-- HIMA TL UNTAN — order schema
-- Run this once in the Supabase SQL Editor.
-- ============================================================

-- ---------- orders ----------
-- One row per checkout. Buyer details live here; the products they
-- picked live in order_items, so a single basket can hold several
-- products with different variants.
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
                 check (order_status in ('pending_verifikasi', 'terjual', 'dibatalkan', 'kadaluarsa')),

  payment_proof_url text,
  verified_by    text,
  verified_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ---------- order_items ----------
-- Price and product name are snapshotted at purchase time so a later
-- price change never rewrites an existing order.
create table if not exists public.order_items (
  id                  uuid primary key default gen_random_uuid(),
  order_id            uuid not null references public.orders(id) on delete cascade,

  product_id          text not null,
  product_name        text not null,
  product_slug        text,
  variant             text,
  stock_type_snapshot text not null
                      check (stock_type_snapshot in ('ready_stock', 'pre_order')),
  qty                 integer not null check (qty > 0),
  unit_price          integer not null,
  subtotal            integer not null
);

create index if not exists order_items_order_id_idx on public.order_items(order_id);
create index if not exists orders_order_code_idx    on public.orders(order_code);
create index if not exists orders_created_at_idx    on public.orders(created_at desc);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table public.orders      enable row level security;
alter table public.order_items enable row level security;

-- Anyone may place an order — checkout is open to students without login.
drop policy if exists "public can create orders" on public.orders;
create policy "public can create orders"
  on public.orders for insert
  to anon, authenticated
  with check (true);

drop policy if exists "public can create order items" on public.order_items;
create policy "public can create order items"
  on public.order_items for insert
  to anon, authenticated
  with check (true);

-- WARNING — read access is currently open to the anon key.
--
-- The buyer needs it to look up an order at /pesanan/cek, and the admin
-- dashboard needs it to list orders. The dashboard's login is still the
-- sessionStorage demo (see SECURITY-TODO.md), so there is no Supabase
-- identity to scope reads to yet.
--
-- Before this handles real orders: move the dashboard onto Supabase Auth,
-- replace the select policy below with one restricted to authenticated
-- staff, and expose single-order lookup through an RPC that takes the
-- order code so buyers never get to read the whole table.
drop policy if exists "anyone can read orders" on public.orders;
create policy "anyone can read orders"
  on public.orders for select
  to anon, authenticated
  using (true);

drop policy if exists "anyone can read order items" on public.order_items;
create policy "anyone can read order items"
  on public.order_items for select
  to anon, authenticated
  using (true);

-- Updates (marking paid/verified) are staff-only. With the demo login
-- there is no authenticated staff user yet, so this stays closed and the
-- dashboard's status controls remain local until auth lands.
drop policy if exists "staff can update orders" on public.orders;
create policy "staff can update orders"
  on public.orders for update
  to authenticated
  using (true)
  with check (true);

-- ============================================================
-- Order code: ORD-2026-0001, sequential per calendar year.
-- ============================================================
create sequence if not exists public.order_code_seq;

create or replace function public.next_order_code()
returns text
language sql
volatile
as $$
  select 'ORD-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval('public.order_code_seq')::text, 4, '0');
$$;

-- Checkout runs with the anon key, so it needs to call the generator.
grant execute on function public.next_order_code() to anon, authenticated;
grant usage, select on sequence public.order_code_seq to anon, authenticated;
