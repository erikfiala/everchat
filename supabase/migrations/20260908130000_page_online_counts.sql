-- Public per-URL online aggregates for Explore realtime.
-- Never publish page_presence (that would leak user_id / who is on which URL).
-- Stale window is 2 minutes — must match lib/presence.ts PRESENCE_STALE_MS.

create table public.page_online_counts (
  canonical_url text primary key,
  online_count integer not null check (online_count >= 0),
  updated_at timestamptz not null default now()
);

comment on table public.page_online_counts is
  'Public per-URL online aggregates. Do not add page_presence to realtime (would leak user_id).';

alter table public.page_online_counts enable row level security;

revoke all on table public.page_online_counts from public, anon, authenticated;
grant select on table public.page_online_counts to anon, authenticated;
revoke insert, update, delete on table public.page_online_counts from public, anon, authenticated;

create policy page_online_counts_select on public.page_online_counts
  for select
  using (true);

create or replace function public.recompute_page_online_count(p_url text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  url text := trim(p_url);
  n integer;
begin
  if url is null or url = '' then
    return;
  end if;

  select count(distinct p.user_id)::integer
    into n
  from public.page_presence p
  where p.canonical_url = url
    and p.last_seen >= now() - interval '2 minutes';

  if n = 0 then
    delete from public.page_online_counts where canonical_url = url;
  else
    insert into public.page_online_counts (canonical_url, online_count, updated_at)
    values (url, n, now())
    on conflict (canonical_url)
    do update set
      online_count = excluded.online_count,
      updated_at = excluded.updated_at;
  end if;
end;
$$;

revoke all on function public.recompute_page_online_count(text) from public;
revoke all on function public.recompute_page_online_count(text) from anon, authenticated;

create or replace function public.trg_page_presence_online_counts()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.recompute_page_online_count(old.canonical_url);
    return old;
  end if;

  perform public.recompute_page_online_count(new.canonical_url);
  if tg_op = 'UPDATE' and old.canonical_url is distinct from new.canonical_url then
    perform public.recompute_page_online_count(old.canonical_url);
  end if;
  return new;
end;
$$;

revoke all on function public.trg_page_presence_online_counts() from public;
revoke all on function public.trg_page_presence_online_counts() from anon, authenticated;

drop trigger if exists trg_page_presence_online_counts on public.page_presence;
create trigger trg_page_presence_online_counts
  after insert or update or delete on public.page_presence
  for each row
  execute function public.trg_page_presence_online_counts();

create or replace function public.touch_page_presence(p_canonical_url text)
returns void
language plpgsql
security definer
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

  -- Drop other users' stale heartbeats so counts fall without pg_cron.
  -- Each delete fires trg_page_presence_online_counts.
  delete from public.page_presence
  where user_id <> uid
    and last_seen < now() - interval '2 minutes';

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

create or replace function public.page_online_counts(p_canonical_urls text[])
returns table (
  canonical_url text,
  online_count integer
)
language sql
stable
security definer
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

select public.recompute_page_online_count(u)
from (
  select distinct p.canonical_url as u
  from public.page_presence p
  where p.last_seen >= now() - interval '2 minutes'
) s;

alter publication supabase_realtime add table public.page_online_counts;
