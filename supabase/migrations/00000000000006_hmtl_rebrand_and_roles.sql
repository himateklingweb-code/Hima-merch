-- ============================================================
-- HMTL rebrand + department role cleanup.
-- Run after the seed content migration.
--
-- Two content corrections the committee asked for:
--   1. Departments have no "Wakil Ketua" — only a head and members. The head
--      is "Kepala Departemen" and everyone else is "Anggota". (BPH keeps its
--      own Ketua/Sekretaris/Bendahara — those position values are distinct,
--      so scoping by value only touches departments.)
--   2. The brand short-form is "HMTL", not "HIMA TL". A token replace keeps
--      surrounding text (year, edition, the full "Himpunan Mahasiswa…" name)
--      intact and leaves slugs/URLs untouched.
--
-- Idempotent: re-running finds nothing left to change.
-- ============================================================

-- ---------- 1. department roles ----------
update public.department_members
  set position = 'Kepala Departemen'
  where position = 'Ketua Departemen';

update public.department_members
  set position = 'Anggota'
  where position in ('Wakil Ketua', 'Staff');

-- ---------- 2. brand rename in live content ----------
update public.products set
    name        = replace(name, 'HIMA TL', 'HMTL'),
    description = replace(description, 'HIMA TL', 'HMTL')
  where name like '%HIMA TL%' or description like '%HIMA TL%';

update public.products set
    seo = replace(seo::text, 'HIMA TL', 'HMTL')::jsonb
  where seo::text like '%HIMA TL%';

update public.articles set
    title     = replace(title, 'HIMA TL', 'HMTL'),
    excerpt   = replace(excerpt, 'HIMA TL', 'HMTL'),
    content   = replace(content, 'HIMA TL', 'HMTL'),
    image_alt = replace(coalesce(image_alt, ''), 'HIMA TL', 'HMTL')
  where title like '%HIMA TL%' or excerpt like '%HIMA TL%'
     or content like '%HIMA TL%' or image_alt like '%HIMA TL%';

update public.articles set
    seo = replace(seo::text, 'HIMA TL', 'HMTL')::jsonb
  where seo::text like '%HIMA TL%';

update public.departments set
    description = replace(description, 'HIMA TL', 'HMTL')
  where description like '%HIMA TL%';
