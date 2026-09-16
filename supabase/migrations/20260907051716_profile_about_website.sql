-- Public profile fields: short bio + website. Same RLS as handle/karma:
-- anyone can read (profiles_select); only the owner can update (profiles_update).

alter table public.profiles
  add column if not exists about text,
  add column if not exists website text;

alter table public.profiles
  drop constraint if exists profiles_about_len,
  drop constraint if exists profiles_website_format;

alter table public.profiles
  add constraint profiles_about_len
    check (about is null or char_length(about) <= 160),
  add constraint profiles_website_format
    check (
      website is null
      or (
        char_length(website) <= 500
        and website ~* '^https?://'
      )
    );

comment on column public.profiles.about is
  'Public short bio (max 160). Owner update; public read.';
comment on column public.profiles.website is
  'Public http(s) website URL. Owner update; public read.';
