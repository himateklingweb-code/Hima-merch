-- ============================================================================
-- 0015 — Bersihkan periode kepengurusan ganda & kunci supaya tidak terulang.
--
-- Masalah: tombol "Tambah Periode" dulu tidak menolak label yang sudah ada,
-- dan tiap klik menyisipkan satu baris per departemen. Akibatnya setiap
-- departemen punya 3 baris "2026/2027" (semuanya aktif), panel admin
-- menulis "3 periode tercatat" dan "21/7 departemen tercatat", padahal
-- periode yang diinput hanya satu.
--
-- Perbaikan:
--   1. Per (departemen, label) disisakan SATU baris — yang anggotanya paling
--      banyak. Anggota di baris lain dipindah ke baris itu, lalu baris
--      ganda dihapus. Tidak ada data pengurus yang hilang.
--   2. Unique index (departemen, label) → label kembar ditolak database.
--   3. Unique index parsial → satu departemen hanya boleh punya satu
--      periode aktif.
--   4. Urutan departemen dirapikan: edit departemen dulu memindahkannya ke
--      urutan terakhir (Pendidikan & Kominfo sama-sama order_index 7).
--      Urutan yang tampil sekarang dipertahankan, hanya angka kembar dibenahi.
--
-- Idempoten: aman dijalankan ulang.
-- ============================================================================

begin;

-- 1. Gabungkan baris periode ganda -------------------------------------------
-- Peta: setiap baris periode → baris yang disisakan untuk (departemen, label).
-- Yang disisakan = anggota terbanyak, lalu yang aktif, lalu id terkecil.
create temporary table period_map on commit drop as
with stats as (
  select p.id,
         p.department_id,
         p.is_active,
         lower(regexp_replace(p.period_label, '\s+', '', 'g')) as label_key,
         (select count(*) from public.department_members m where m.period_id = p.id) as n_members
  from public.department_periods p
),
ranked as (
  select s.*,
         first_value(s.id) over (
           partition by s.department_id, s.label_key
           order by s.n_members desc, s.is_active desc, s.id
         ) as keep_id,
         bool_or(s.is_active) over (partition by s.department_id, s.label_key) as any_active
  from stats s
)
select id, keep_id, any_active from ranked;

-- Pindahkan anggota dari baris ganda ke baris yang disisakan.
update public.department_members m
set period_id = pm.keep_id
from period_map pm
where m.period_id = pm.id and pm.id <> pm.keep_id;

-- Baris yang disisakan ikut aktif bila salah satu kembarannya aktif.
update public.department_periods p
set is_active = true
from period_map pm
where p.id = pm.id and pm.id = pm.keep_id and pm.any_active and not p.is_active;

-- Hapus baris ganda (sudah kosong anggota).
delete from public.department_periods p
using period_map pm
where p.id = pm.id and pm.id <> pm.keep_id;

-- Rapikan label (tanpa spasi), mis. "2026 / 2027" → "2026/2027".
update public.department_periods
set period_label = regexp_replace(period_label, '\s+', '', 'g')
where period_label ~ '\s';

-- Bila satu departemen masih punya >1 periode aktif (label berbeda),
-- sisakan yang labelnya terbaru.
update public.department_periods p
set is_active = false
where p.is_active
  and exists (
    select 1 from public.department_periods q
    where q.department_id = p.department_id
      and q.is_active
      and q.period_label > p.period_label
  );


-- 2 & 3. Kunci di level database --------------------------------------------
-- Dibandingkan tanpa spasi & huruf besar/kecil: "2026/2027", "2026 / 2027",
-- dan "2026/2027 " dianggap label yang sama.
drop index if exists public.department_periods_dept_label_uniq;
create unique index department_periods_dept_label_uniq
  on public.department_periods (department_id, lower(regexp_replace(period_label, '\s+', '', 'g')));

create unique index if not exists department_periods_one_active_per_dept
  on public.department_periods (department_id)
  where is_active;


-- 4. Urutan departemen ------------------------------------------------------
-- Urutan yang tampil sekarang dipertahankan; hanya nilai kembar yang
-- dirapikan jadi berurutan 0, 1, 2, … (BPH selalu pertama).
with ordered as (
  select id,
         row_number() over (
           order by (id = 'dept-bph') desc, order_index, id
         ) - 1 as rn
  from public.departments
)
update public.departments d
set order_index = o.rn
from ordered o
where d.id = o.id and d.order_index is distinct from o.rn;

commit;

-- Cek hasil (harus 1 baris per departemen untuk 2026/2027, total 7):
-- select department_id, period_label, is_active,
--        (select count(*) from department_members m where m.period_id = p.id) as anggota
-- from department_periods p order by department_id;
