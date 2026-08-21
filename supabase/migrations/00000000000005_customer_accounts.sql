-- ============================================================
-- Customer accounts + order binding.
-- Run after 00000000000004_staff_self_service.sql.
--
-- Until now an order belonged to nobody: it was placed anonymously and could
-- only be re-found by its code. This binds every order to a signed-in
-- Supabase Auth user, lets a buyer read their own orders, and makes signing
-- in a hard requirement for ordering — enforced in the database, not just in
-- the UI.
--
-- A "customer" needs no new table: it is simply an authenticated user with no
-- row in `staff`. is_staff() already returns false for them, so the existing
-- staff-only policies keep the order tables closed to them; they reach their
-- own orders through list_my_orders() below instead.
--
-- NOTE: this replaces create_order. The ONLY behavioural changes are the
-- login requirement and the two columns it now fills. Pricing, stock holds,
-- the per-number and per-network rate limits, and code allocation are
-- unchanged from the live definition.
-- ============================================================

-- ---------- 1. bind orders to an account ----------
alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;
-- Snapshot of the account's email at order time, so the dashboard can show
-- who ordered without joining auth.users (which is not readable from the API).
alter table public.orders
  add column if not exists buyer_email text;

create index if not exists orders_user_id_idx
  on public.orders(user_id, created_at desc);

-- ---------- 2. create_order now requires a signed-in buyer ----------
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
  v_ip         text;
  v_uid        uuid;
  v_email      text;
begin
  -- Login gate. SECURITY DEFINER changes the role used for permission
  -- checks, not the request's JWT, so auth.uid() still reflects the caller.
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

  -- Limit 1: same WhatsApp number.
  select count(*) into v_recent
  from public.orders
  where buyer_wa = p_buyer_wa
    and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'Terlalu banyak pesanan dari nomor ini. Coba lagi nanti.'
      using errcode = '53400';
  end if;

  -- Limit 2: same address. Set higher than the per-number cap so a shared
  -- campus or hotspot connection is not locked out by one busy sender.
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

-- Login is now mandatory, so anon can no longer place an order. authenticated
-- keeps the grant.
revoke execute on function public.create_order(text, text, text, jsonb, text, text, text)
  from anon;
grant execute on function public.create_order(text, text, text, jsonb, text, text, text)
  to authenticated;

-- ---------- 3. a buyer reading their own orders ----------
-- SECURITY DEFINER, filtered by auth.uid(): the caller only ever sees their
-- own rows, so the order tables stay staff-only at the table level and no
-- buyer-facing SELECT policy (with its cross-table RLS recursion) is needed.
create or replace function public.list_my_orders()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $fn$
  select coalesce(jsonb_agg(o_json order by created_at desc), '[]'::jsonb)
  from (
    select
      o.created_at,
      jsonb_build_object(
        'order_code', o.order_code,
        'buyer_name', o.buyer_name,
        'buyer_wa_masked', '•••• ' || right(o.buyer_wa, 4),
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
      ) as o_json
    from public.orders o
    where o.user_id = auth.uid()
  ) s;
$fn$;

revoke all on function public.list_my_orders() from public, anon;
grant execute on function public.list_my_orders() to authenticated;

-- ---------- 4. keep open sign-ups from seizing admin ----------
-- The bootstrap used to fire whenever `staff` was empty. With customer
-- sign-ups now flowing into auth.users, that would let a random new account
-- become admin on a fresh install. Restrict it to the genuine first user.
create or replace function public.bootstrap_first_staff()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  if (select count(*) from auth.users) <= 1
     and (select count(*) from public.staff) = 0 then
    insert into public.staff (id, email, full_name, role)
    values (new.id, new.email,
            coalesce(new.raw_user_meta_data->>'full_name', 'Admin HIMA TL'),
            'admin')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$fn$;
