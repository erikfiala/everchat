-- Live presence: one row per logged-in user on their active-tab canonical URL.
-- Public clients only see aggregates via page_online_counts (no user_id).
-- Stale window is 2 minutes — must match lib/presence.ts PRESENCE_STALE_MS.

create table public.page_presence (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  canonical_url text not null,
  last_seen timestamptz not null default now()
);

create index page_presence_url_seen_idx
  on public.page_presence (canonical_url, last_seen);

alter table public.page_presence enable row level security;

revoke all on table public.page_presence from public, anon;
grant select, insert, update, delete on table public.page_presence to authenticated;

create policy page_presence_select on public.page_presence
  for select
  using (user_id = public.current_user_id());

create policy page_presence_insert on public.page_presence
  for insert
  with check (user_id = public.current_user_id());

create policy page_presence_update on public.page_presence
  for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create policy page_presence_delete on public.page_presence
  for delete
  using (user_id = public.current_user_id());

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

create or replace function public.clear_page_presence()
returns void
language plpgsql
security definer
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
    p.canonical_url,
    count(*)::integer as online_count
  from public.page_presence p
  where cardinality(coalesce(p_canonical_urls, '{}')) > 0
    and p.last_seen >= now() - interval '2 minutes'
    and p.canonical_url = any (p_canonical_urls)
  group by p.canonical_url;
$$;

revoke all on function public.page_online_counts(text[]) from public;
grant execute on function public.page_online_counts(text[]) to anon, authenticated;
