-- Public theme gallery: token JSON only. Writes go through publish-theme (service role).

create table public.themes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  author_name text not null,
  font_family text not null default '',
  tokens jsonb not null,
  created_at timestamptz not null default now(),
  constraint themes_name_len check (char_length(name) between 1 and 80),
  constraint themes_author_len check (char_length(author_name) between 1 and 40),
  constraint themes_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$'),
  constraint themes_font_family check (
    font_family = ''
    or font_family ~ '^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$'
  ),
  constraint themes_tokens_object check (jsonb_typeof(tokens) = 'object'),
  constraint themes_tokens_size check (octet_length(tokens::text) <= 8192),
  constraint themes_no_css_smuggle check (
    tokens::text !~* 'url\s*\('
    and tokens::text !~* '@import'
    and tokens::text !~* '<[[:space:]]*script'
    and tokens::text !~* 'javascript:'
    and name !~* 'url\s*\(|@import|javascript:'
    and author_name !~* 'url\s*\(|@import|javascript:'
    and font_family !~* 'url\s*\(|@import|javascript:'
  )
);

create index themes_created_at_idx on public.themes (created_at desc);

create table public.theme_publish_limits (
  client_hash text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (client_hash, window_start)
);

alter table public.themes enable row level security;
alter table public.theme_publish_limits enable row level security;

create policy themes_select_public on public.themes
  for select
  using (true);

revoke all on public.themes from anon, authenticated;
grant select on public.themes to anon, authenticated;

revoke all on public.theme_publish_limits from anon, authenticated;
