-- ============================================================
-- Optional call-to-action button at the end of an article.
--
-- Both columns are nullable and the public page only renders the button
-- when both are non-empty — an article with neither set looks exactly as
-- it did before this migration.
-- ============================================================

alter table public.articles
  add column if not exists cta_label text,
  add column if not exists cta_url   text;
