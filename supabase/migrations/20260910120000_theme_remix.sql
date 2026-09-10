-- Remix attribution: a published theme can point at the skin it was forked from.

alter table public.themes
  add column if not exists remix_of_slug text;

alter table public.themes
  add column if not exists remix_of_name text;

alter table public.themes
  drop constraint if exists themes_remix_of_slug_format;

alter table public.themes
  add constraint themes_remix_of_slug_format check (
    remix_of_slug is null
    or remix_of_slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'
  );

alter table public.themes
  drop constraint if exists themes_remix_of_name_len;

alter table public.themes
  add constraint themes_remix_of_name_len check (
    remix_of_name is null
    or char_length(remix_of_name) between 1 and 80
  );

alter table public.themes
  drop constraint if exists themes_remix_pair;

alter table public.themes
  add constraint themes_remix_pair check (
    (remix_of_slug is null and remix_of_name is null)
    or (remix_of_slug is not null and remix_of_name is not null)
  );

alter table public.themes
  drop constraint if exists themes_remix_no_css;

alter table public.themes
  add constraint themes_remix_no_css check (
    remix_of_name is null
    or remix_of_name !~* E'url\\s*\\(|@import|javascript:'
  );
