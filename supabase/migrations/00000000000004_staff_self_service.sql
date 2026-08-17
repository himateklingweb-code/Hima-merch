-- ============================================================
-- Staff management without SQL.
--
-- Adding a committee member took two steps in two different tools: create
-- the account in the Auth dashboard, then hand-write an INSERT. The insert
-- is a button now, and the very first account promotes itself so a fresh
-- install can never lock you out.
-- ============================================================

-- ---------- 1. bootstrap: the first account becomes admin ----------
-- Without this, a new project has an account that signs in fine and sees
-- nothing, and the only way out is the SQL editor.
create or replace function public.bootstrap_first_staff()
returns trigger
language plpgsql security definer
set search_path = public, pg_temp as $fn$
begin
  if (select count(*) from public.staff) = 0 then
    insert into public.staff (id, email, full_name, role)
    values (new.id, new.email,
            coalesce(new.raw_user_meta_data->>'full_name', 'Admin HIMA TL'),
            'admin')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$fn$;

drop trigger if exists on_auth_user_created_bootstrap on auth.users;
create trigger on_auth_user_created_bootstrap
  after insert on auth.users
  for each row execute function public.bootstrap_first_staff();

-- ---------- 2. who is an admin ----------
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, pg_temp as $fn$
  select exists (
    select 1 from public.staff where id = auth.uid() and role = 'admin'
  );
$fn$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- 3. accounts waiting to be given access ----------
-- Admin-only: this is a list of real people's email addresses.
create or replace function public.list_pending_users()
returns table(email text, created_at timestamptz)
language plpgsql stable security definer
set search_path = public, pg_temp as $fn$
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh melihat daftar akun.'
      using errcode = '42501';
  end if;
  return query
    select u.email::text, u.created_at
    from auth.users u
    left join public.staff s on s.id = u.id
    where s.id is null
    order by u.created_at desc;
end;
$fn$;

revoke all on function public.list_pending_users() from public, anon;
grant execute on function public.list_pending_users() to authenticated;

-- ---------- 4. grant access ----------
create or replace function public.add_staff_by_email(
  p_email text,
  p_full_name text default null,
  p_role text default 'kasir'
) returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp as $fn$
declare v_user auth.users%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menambah pengurus.'
      using errcode = '42501';
  end if;
  if p_role not in ('admin','kasir') then
    raise exception 'Peran tidak valid.' using errcode = '22023';
  end if;

  select * into v_user from auth.users where lower(email) = lower(trim(p_email));
  if not found then
    raise exception 'Belum ada akun dengan email itu. Buat dulu di Authentication → Users.'
      using errcode = '22023';
  end if;

  insert into public.staff (id, email, full_name, role)
  values (v_user.id, v_user.email,
          coalesce(nullif(trim(coalesce(p_full_name,'')),''), v_user.email),
          p_role)
  on conflict (id) do update
    set full_name = excluded.full_name, role = excluded.role;

  return jsonb_build_object('ok', true, 'email', v_user.email);
end;
$fn$;

revoke all on function public.add_staff_by_email(text, text, text) from public, anon;
grant execute on function public.add_staff_by_email(text, text, text) to authenticated;

-- ---------- 5. revoke access ----------
create or replace function public.remove_staff(p_email text)
returns jsonb
language plpgsql volatile security definer
set search_path = public, pg_temp as $fn$
declare v_id uuid; v_admins int;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin yang boleh menghapus pengurus.'
      using errcode = '42501';
  end if;

  select id into v_id from public.staff where lower(email) = lower(trim(p_email));
  if v_id is null then
    raise exception 'Pengurus tidak ditemukan.' using errcode = '22023';
  end if;
  if v_id = auth.uid() then
    raise exception 'Tidak bisa menghapus akun sendiri.' using errcode = '22023';
  end if;

  -- Never leave the dashboard without an admin, or the next change needs
  -- the SQL editor again.
  select count(*) into v_admins from public.staff where role = 'admin';
  if v_admins <= 1
     and exists (select 1 from public.staff where id = v_id and role = 'admin') then
    raise exception 'Ini satu-satunya admin. Angkat admin lain dulu.'
      using errcode = '22023';
  end if;

  delete from public.staff where id = v_id;
  return jsonb_build_object('ok', true);
end;
$fn$;

revoke all on function public.remove_staff(text) from public, anon;
grant execute on function public.remove_staff(text) to authenticated;

-- ---------- 6. staff may read the roster ----------
-- The old policy only let someone see their own row, so a management screen
-- could never list anyone.
drop policy if exists "staff read own row" on public.staff;
drop policy if exists "staff read roster" on public.staff;
create policy "staff read roster"
  on public.staff for select to authenticated
  using (id = (select auth.uid()) or public.is_staff());
