-- Clear lints 0028/0029 (SECURITY DEFINER RPCs callable via PostgREST) and
-- 0008 (RLS enabled with no policies). Public RPCs become SECURITY INVOKER
-- and use existing table RLS. Stale presence cleanup stays privileged via a
-- DEFINER trigger that is not granted to anon/authenticated.

-- ---------------------------------------------------------------------------
-- 1) Drop other users' stale heartbeats so counts fall without pg_cron.
--    Must not live in a client RPC (would require SECURITY DEFINER + EXECUTE).
-- ---------------------------------------------------------------------------
create or replace function public.trg_page_presence_purge_stale()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.page_presence
  where user_id <> new.user_id
    and last_seen < now() - interval '2 minutes';
  return new;
end;
$$;

drop trigger if exists trg_page_presence_purge_stale on public.page_presence;
create trigger trg_page_presence_purge_stale
  before insert or update on public.page_presence
  for each row
  execute function public.trg_page_presence_purge_stale();

revoke all on function public.trg_page_presence_purge_stale() from public;
revoke all on function public.trg_page_presence_purge_stale() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) Presence / counts / leaderboard: SECURITY INVOKER + table RLS
-- ---------------------------------------------------------------------------
create or replace function public.touch_page_presence(p_canonical_url text)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := public.current_user_id();
  url text := trim(p_canonical_url);
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if url is null or url = '' or char_length(url) > 2048 then
    raise exception 'Invalid canonical_url';
  end if;

  insert into public.page_presence (user_id, canonical_url, last_seen)
  values (uid, url, now())
  on conflict (user_id)
  do update set
    canonical_url = excluded.canonical_url,
    last_seen = excluded.last_seen;
end;
$$;

revoke all on function public.touch_page_presence(text) from public;
grant execute on function public.touch_page_presence(text) to anon, authenticated;

comment on function public.touch_page_presence(text) is
  'Upsert the caller''s page presence (SECURITY INVOKER + RLS). Stale rows for other users are purged by trg_page_presence_purge_stale.';

create or replace function public.clear_page_presence()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := public.current_user_id();
begin
  if uid is null then
    return;
  end if;
  delete from public.page_presence where user_id = uid;
end;
$$;

revoke all on function public.clear_page_presence() from public;
grant execute on function public.clear_page_presence() to anon, authenticated;

comment on function public.clear_page_presence() is
  'Delete the caller''s page presence row (SECURITY INVOKER + RLS). No-op when logged out.';

create or replace function public.page_online_counts(p_canonical_urls text[])
returns table (
  canonical_url text,
  online_count integer
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.canonical_url,
    c.online_count
  from public.page_online_counts c
  where cardinality(coalesce(p_canonical_urls, '{}')) > 0
    and c.canonical_url = any (p_canonical_urls);
$$;

revoke all on function public.page_online_counts(text[]) from public;
grant execute on function public.page_online_counts(text[]) to anon, authenticated;

comment on function public.page_online_counts(text[]) is
  'Public per-URL online aggregates (SECURITY INVOKER). Same rows as SELECT on page_online_counts.';

create or replace function public.leaderboard(
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  rank integer,
  username text,
  avatar_url text,
  karma integer,
  is_me boolean
)
language sql
stable
security invoker
set search_path = public
as $$
  with me as (
    select p.id, p.username, p.avatar_url, p.karma
    from public.profiles p
    where p.id = public.current_user_id()
  ),
  ranked as (
    select
      row_number() over (order by p.karma desc, p.username asc)::integer as rank,
      p.id,
      p.username::text as username,
      p.avatar_url,
      p.karma
    from public.profiles p
  ),
  top as (
    select r.*
    from ranked r
    where r.rank <= 100
    order by r.rank
    limit least(greatest(coalesce(p_limit, 20), 0), 100)
    offset least(greatest(coalesce(p_offset, 0), 0), 100)
  )
  select
    t.rank,
    t.username,
    t.avatar_url,
    t.karma,
    (m.id is not null and t.id = m.id) as is_me
  from top t
  left join me m on true
  union all
  select
    (
      select (count(*) + 1)::integer
      from public.profiles p
      where p.karma > m.karma
         or (p.karma = m.karma and p.username < m.username)
    ) as rank,
    m.username::text,
    m.avatar_url,
    m.karma,
    true as is_me
  from me m
  where not exists (select 1 from top t where t.id = m.id);
$$;

revoke all on function public.leaderboard(integer, integer) from public;
grant execute on function public.leaderboard(integer, integer) to anon, authenticated;

comment on function public.leaderboard(integer, integer) is
  'Paginated karma ranking from public profiles (SECURITY INVOKER + profiles_select).';

-- ---------------------------------------------------------------------------
-- 3) Service-role-only rate tables: explicit deny (lint 0008)
--    Edge functions use service_role, which bypasses RLS.
-- ---------------------------------------------------------------------------
drop policy if exists theme_like_limits_deny on public.theme_like_limits;
create policy theme_like_limits_deny on public.theme_like_limits
  for all
  using (false)
  with check (false);

drop policy if exists theme_publish_limits_deny on public.theme_publish_limits;
create policy theme_publish_limits_deny on public.theme_publish_limits
  for all
  using (false)
  with check (false);

comment on table public.theme_like_limits is
  'Hourly like-rate counters. No client access; like-theme edge uses service_role.';

comment on table public.theme_publish_limits is
  'Hourly publish-rate counters. No client access; publish-theme edge uses service_role.';
