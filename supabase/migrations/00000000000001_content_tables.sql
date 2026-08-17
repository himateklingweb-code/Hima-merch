-- ============================================================
-- Content tables — the rest of the CMS.
--
-- Berita, departemen, iklan and mitra used to be TypeScript files, which
-- meant the dashboard screens for them only held edits until refresh.
-- They live here now, so the committee can actually manage the site.
--
-- Icons are stored as a Lucide component *name*, since a React component
-- cannot live in a column; the app maps it back with iconFromName().
-- ============================================================

create table if not exists public.articles (
  id           text primary key,
  title        text not null,
  slug         text unique not null,
  excerpt      text not null default '',
  content      text not null default '',
  category     text not null default 'Kegiatan',
  author       text not null default 'Tim Kominfo',
  image        text,
  image_alt    text,
  published_at date not null default current_date,
  is_published boolean not null default true,
  seo          jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.departments (
  id          text primary key,
  name        text not null,
  slug        text unique not null,
  description text not null default '',
  icon        text not null default 'Users',
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.department_periods (
  id            text primary key,
  department_id text not null references public.departments(id) on delete cascade,
  period_label  text not null,
  is_active     boolean not null default false,
  start_date    date,
  end_date      date
);

create table if not exists public.department_members (
  id          text primary key,
  period_id   text not null references public.department_periods(id) on delete cascade,
  name        text not null,
  position    text not null,
  photo       text,
  contact     text,
  order_index integer not null default 0
);

create table if not exists public.partners (
  id          text primary key,
  name        text not null,
  logo        text,
  description text not null default '',
  website     text,
  type        text not null default 'mitra' check (type in ('sponsor', 'mitra')),
  order_index integer not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.ads (
  id          text primary key,
  name        text not null,
  blurb       text not null default '',
  logo        text,
  website     text not null,
  active      boolean not null default true,
  order_index integer not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists articles_published_idx
  on public.articles(is_published, published_at desc);
create index if not exists department_periods_dept_idx
  on public.department_periods(department_id);
create index if not exists department_members_period_idx
  on public.department_members(period_id);
create index if not exists ads_active_order_idx      on public.ads(active, order_index);
create index if not exists partners_active_order_idx on public.partners(is_active, order_index);

-- ============================================================
-- RLS — public reads published content, staff writes everything.
--
-- Split by role for the same reason products are: an `anon` predicate must
-- never call is_staff(), because anon has no EXECUTE on it and the whole
-- read would fail with "permission denied for function is_staff".
-- ============================================================
alter table public.articles           enable row level security;
alter table public.departments        enable row level security;
alter table public.department_periods enable row level security;
alter table public.department_members enable row level security;
alter table public.partners           enable row level security;
alter table public.ads                enable row level security;

-- articles
drop policy if exists "public reads published articles" on public.articles;
create policy "public reads published articles"
  on public.articles for select to anon using (is_published);
drop policy if exists "staff reads all articles" on public.articles;
create policy "staff reads all articles"
  on public.articles for select to authenticated using (is_published or public.is_staff());
drop policy if exists "staff writes articles" on public.articles;
create policy "staff writes articles"
  on public.articles for insert to authenticated with check (public.is_staff());
drop policy if exists "staff updates articles" on public.articles;
create policy "staff updates articles"
  on public.articles for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff deletes articles" on public.articles;
create policy "staff deletes articles"
  on public.articles for delete to authenticated using (public.is_staff());

-- departments, periods and members are public reference data
drop policy if exists "public reads departments" on public.departments;
create policy "public reads departments"
  on public.departments for select to anon, authenticated using (true);
drop policy if exists "staff writes departments" on public.departments;
create policy "staff writes departments"
  on public.departments for insert to authenticated with check (public.is_staff());
drop policy if exists "staff updates departments" on public.departments;
create policy "staff updates departments"
  on public.departments for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff deletes departments" on public.departments;
create policy "staff deletes departments"
  on public.departments for delete to authenticated using (public.is_staff());

drop policy if exists "public reads periods" on public.department_periods;
create policy "public reads periods"
  on public.department_periods for select to anon, authenticated using (true);
drop policy if exists "staff writes periods" on public.department_periods;
create policy "staff writes periods"
  on public.department_periods for insert to authenticated with check (public.is_staff());
drop policy if exists "staff updates periods" on public.department_periods;
create policy "staff updates periods"
  on public.department_periods for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff deletes periods" on public.department_periods;
create policy "staff deletes periods"
  on public.department_periods for delete to authenticated using (public.is_staff());

drop policy if exists "public reads members" on public.department_members;
create policy "public reads members"
  on public.department_members for select to anon, authenticated using (true);
drop policy if exists "staff writes members" on public.department_members;
create policy "staff writes members"
  on public.department_members for insert to authenticated with check (public.is_staff());
drop policy if exists "staff updates members" on public.department_members;
create policy "staff updates members"
  on public.department_members for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff deletes members" on public.department_members;
create policy "staff deletes members"
  on public.department_members for delete to authenticated using (public.is_staff());

-- partners
drop policy if exists "public reads active partners" on public.partners;
create policy "public reads active partners"
  on public.partners for select to anon using (is_active);
drop policy if exists "staff reads all partners" on public.partners;
create policy "staff reads all partners"
  on public.partners for select to authenticated using (is_active or public.is_staff());
drop policy if exists "staff writes partners" on public.partners;
create policy "staff writes partners"
  on public.partners for insert to authenticated with check (public.is_staff());
drop policy if exists "staff updates partners" on public.partners;
create policy "staff updates partners"
  on public.partners for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff deletes partners" on public.partners;
create policy "staff deletes partners"
  on public.partners for delete to authenticated using (public.is_staff());

-- ads
drop policy if exists "public reads active ads" on public.ads;
create policy "public reads active ads"
  on public.ads for select to anon using (active);
drop policy if exists "staff reads all ads" on public.ads;
create policy "staff reads all ads"
  on public.ads for select to authenticated using (active or public.is_staff());
drop policy if exists "staff writes ads" on public.ads;
create policy "staff writes ads"
  on public.ads for insert to authenticated with check (public.is_staff());
drop policy if exists "staff updates ads" on public.ads;
create policy "staff updates ads"
  on public.ads for update to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists "staff deletes ads" on public.ads;
create policy "staff deletes ads"
  on public.ads for delete to authenticated using (public.is_staff());
