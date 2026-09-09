-- Theme likes + system default. Counts are public; who liked stays private.
-- Filename is after 20260909090000_themes.sql: `supabase migration new`
-- stamped UTC 05:08, which would run before `themes` exists.
--
-- themes_no_css_smuggle was stored with doubled backslashes, so the regex
-- has an unescaped '(' and every insert fails. Recreate it before seeding.

alter table public.themes drop constraint if exists themes_no_css_smuggle;
alter table public.themes add constraint themes_no_css_smuggle check (
  tokens::text !~* E'url\\s*\\('
  and tokens::text !~* '@import'
  and tokens::text !~* E'<[[:space:]]*script'
  and tokens::text !~* 'javascript:'
  and name !~* E'url\\s*\\(|@import|javascript:'
  and author_name !~* E'url\\s*\\(|@import|javascript:'
  and font_family !~* E'url\\s*\\(|@import|javascript:'
);

alter table public.themes
  add column like_count integer not null default 0;

alter table public.themes
  add constraint themes_like_count_nonneg check (like_count >= 0);

create index themes_best_idx on public.themes (like_count desc, created_at desc);

create table public.theme_likes (
  theme_id uuid not null references public.themes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  client_hash text,
  created_at timestamptz not null default now(),
  constraint theme_likes_identity check (
    (user_id is not null and client_hash is null)
    or (user_id is null and client_hash is not null)
  ),
  constraint theme_likes_hash_len check (
    client_hash is null or char_length(client_hash) between 16 and 128
  )
);

create unique index theme_likes_user_idx
  on public.theme_likes (theme_id, user_id)
  where user_id is not null;

create unique index theme_likes_hash_idx
  on public.theme_likes (theme_id, client_hash)
  where client_hash is not null;

create index theme_likes_theme_idx on public.theme_likes (theme_id);

create table public.theme_like_limits (
  client_key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (client_key, window_start)
);

create or replace function public.recompute_theme_likes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  tid uuid;
begin
  tid := coalesce(new.theme_id, old.theme_id);
  update public.themes
  set like_count = (select count(*)::integer from public.theme_likes where theme_id = tid)
  where id = tid;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger theme_likes_recompute
after insert or delete on public.theme_likes
for each row execute function public.recompute_theme_likes();

create or replace function public.themes_protect_default()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.slug = 'everchat' then
    raise exception 'cannot delete the default theme';
  end if;
  return old;
end;
$$;

create trigger themes_protect_default
before delete on public.themes
for each row execute function public.themes_protect_default();

alter table public.theme_likes enable row level security;
alter table public.theme_like_limits enable row level security;

create policy theme_likes_select_own on public.theme_likes
  for select
  using (user_id = public.current_user_id());

create policy theme_likes_insert_own on public.theme_likes
  for insert
  with check (
    user_id = public.current_user_id()
    and client_hash is null
  );

create policy theme_likes_delete_own on public.theme_likes
  for delete
  using (user_id = public.current_user_id());

revoke all on public.theme_likes from anon, authenticated;
grant select, insert, delete on public.theme_likes to authenticated;

revoke all on public.theme_like_limits from anon, authenticated;

revoke all on function public.recompute_theme_likes() from public;
revoke all on function public.recompute_theme_likes() from anon, authenticated;
grant execute on function public.recompute_theme_likes() to postgres, service_role;

revoke all on function public.themes_protect_default() from public;
revoke all on function public.themes_protect_default() from anon, authenticated;
grant execute on function public.themes_protect_default() to postgres, service_role;

insert into public.themes (
  id,
  slug,
  name,
  author_name,
  font_family,
  tokens,
  created_at
) values (
  'e0e0e0e0-0000-4000-8000-000000000001',
  'everchat',
  'Default',
  'Everchat',
  '',
  jsonb_build_object(
    '-' || '-color-background', '#fafafa',
    '-' || '-color-foreground', '#18181b',
    '-' || '-color-muted', '#f4f4f5',
    '-' || '-color-muted-foreground', '#71717a',
    '-' || '-color-border', '#e4e4e7',
    '-' || '-color-card', '#ffffff',
    '-' || '-color-primary', '#27272a',
    '-' || '-color-primary-foreground', '#fafafa',
    '-' || '-color-accent', '#f4f4f5',
    '-' || '-color-anonymous-avatar', '#e4e4e7',
    '-' || '-color-destructive', '#dc2626',
    '-' || '-color-success', '#0f766e',
    '-' || '-color-score-pos', '#0f766e',
    '-' || '-color-score-neg', '#dc2626',
    '-' || '-color-ring', '#a1a1aa',
    '-' || '-color-hover-background', '#f4f4f5',
    '-' || '-color-hover-border', '#d4d4d8',
    '-' || '-color-hover-foreground', '#18181b',
    '-' || '-radius-sm', 6,
    '-' || '-radius-md', 8,
    '-' || '-radius-lg', 12,
    '-' || '-font-size', 14,
    '-' || '-font-size-sm', 12,
    '-' || '-font-size-lg', 16,
    '-' || '-border-width', 1,
    '-' || '-space-pad', 12,
    '-' || '-space-margin', 8,
    '-' || '-space-composer-pad', 12
  ),
  '2020-01-01T00:00:00Z'
)
on conflict (slug) do nothing;
