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

create or replace function public.themes_validate_tokens()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  key text;
  val jsonb;
  allowed text[] := array[
    '--color-background',
    '--color-foreground',
    '--color-muted',
    '--color-muted-foreground',
    '--color-border',
    '--color-card',
    '--color-primary',
    '--color-primary-foreground',
    '--color-accent',
    '--color-anonymous-avatar',
    '--color-destructive',
    '--color-success',
    '--color-score-pos',
    '--color-score-neg',
    '--color-ring',
    '--color-hover-background',
    '--color-hover-border',
    '--color-hover-foreground',
    '--radius-sm',
    '--radius-md',
    '--radius-lg',
    '--font-size',
    '--font-size-sm',
    '--font-size-lg',
    '--border-width',
    '--space-pad',
    '--space-margin',
    '--space-composer-pad'
  ];
  color_keys text[] := array[
    '--color-background',
    '--color-foreground',
    '--color-muted',
    '--color-muted-foreground',
    '--color-border',
    '--color-card',
    '--color-primary',
    '--color-primary-foreground',
    '--color-accent',
    '--color-anonymous-avatar',
    '--color-destructive',
    '--color-success',
    '--color-score-pos',
    '--color-score-neg',
    '--color-ring',
    '--color-hover-background',
    '--color-hover-border',
    '--color-hover-foreground'
  ];
  n numeric;
begin
  if jsonb_typeof(new.tokens) <> 'object' then
    raise exception 'theme tokens must be an object';
  end if;

  for key, val in select * from jsonb_each(new.tokens)
  loop
    if not (key = any (allowed)) then
      raise exception 'unknown theme token %', key;
    end if;
    if key = any (color_keys) then
      if jsonb_typeof(val) <> 'string' or (val #>> '{}') !~ '^#[0-9A-Fa-f]{6}$' then
        raise exception 'invalid color for %', key;
      end if;
    else
      if jsonb_typeof(val) <> 'number' then
        raise exception 'invalid size for %', key;
      end if;
      n := (val #>> '{}')::numeric;
      if key in ('--radius-sm', '--radius-md', '--radius-lg') then
        if n < 0 or n > 32 then raise exception 'out of range %', key; end if;
      elsif key = '--font-size' then
        if n < 10 or n > 24 then raise exception 'out of range %', key; end if;
      elsif key = '--font-size-sm' then
        if n < 10 or n > 22 then raise exception 'out of range %', key; end if;
      elsif key = '--font-size-lg' then
        if n < 12 or n > 28 then raise exception 'out of range %', key; end if;
      elsif key = '--border-width' then
        if n < 0 or n > 8 then raise exception 'out of range %', key; end if;
      else
        if n < 0 or n > 48 then raise exception 'out of range %', key; end if;
      end if;
    end if;
  end loop;

  return new;
end;
$$;

drop trigger if exists themes_validate_tokens on public.themes;
create trigger themes_validate_tokens
  before insert or update on public.themes
  for each row
  execute function public.themes_validate_tokens();

alter table public.themes enable row level security;
alter table public.theme_publish_limits enable row level security;

create policy themes_select_public on public.themes
  for select
  using (true);

revoke all on public.themes from anon, authenticated;
grant select on public.themes to anon, authenticated;

revoke all on public.theme_publish_limits from anon, authenticated;

revoke all on function public.themes_validate_tokens() from public;
revoke all on function public.themes_validate_tokens() from anon, authenticated;
grant execute on function public.themes_validate_tokens() to postgres, service_role;
