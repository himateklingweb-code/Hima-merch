-- ============================================================
-- Content images: replace the "paste a Google Drive link" workflow with a
-- real upload. Staff upload straight from the dashboard; the public reads the
-- image back from a public bucket. Capped at 2 MB, images only.
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-images', 'content-images', true, 2097152,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true,
      file_size_limit = 2097152,
      allowed_mime_types = array['image/jpeg','image/png','image/webp'];

-- Anyone may read (it is a public bucket, and the storefront shows these).
drop policy if exists "public read content images" on storage.objects;
create policy "public read content images" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'content-images');

-- Only signed-in committee members (a row in `staff`) may add or remove them.
drop policy if exists "staff upload content images" on storage.objects;
create policy "staff upload content images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'content-images' and public.is_staff());

drop policy if exists "staff update content images" on storage.objects;
create policy "staff update content images" on storage.objects
  for update to authenticated
  using (bucket_id = 'content-images' and public.is_staff())
  with check (bucket_id = 'content-images' and public.is_staff());

drop policy if exists "staff delete content images" on storage.objects;
create policy "staff delete content images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'content-images' and public.is_staff());
