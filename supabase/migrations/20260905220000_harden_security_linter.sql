-- Harden schema against Supabase database linter findings.
-- Keeps anon SELECT on trending (SECURITY INVOKER + public pages/messages read).
-- Profile inserts stay service-role-only (register edge). Page writes require JWT sub.

-- ---------------------------------------------------------------------------
-- 1) trending_pages: SECURITY INVOKER (satisfies lint 0010)
-- ---------------------------------------------------------------------------
drop view if exists public.trending_pages;

create view public.trending_pages
with (security_invoker = true)
as
select
  p.id,
  p.canonical_url,
  p.title,
  p.description,
  p.favicon_url,
  count(m.id)::integer as message_count
from public.pages p
join public.messages m on m.page_id = p.id
where m.created_at >= now() - interval '24 hours'
  and m.deleted_at is null
group by p.id
having count(m.id) > 0
order by count(m.id) desc;

grant select on public.trending_pages to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) current_user_id: fixed search_path
-- ---------------------------------------------------------------------------
create or replace function public.current_user_id()
returns uuid
language sql
stable
set search_path = public
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

-- ---------------------------------------------------------------------------
-- 3) Move citext into extensions (lint 0014)
-- Username helpers that declare `citext` locals need search_path including
-- extensions; see 20260905221000_fix_citext_function_search_path.sql.
-- ---------------------------------------------------------------------------
create schema if not exists extensions;
grant usage on schema extensions to postgres, anon, authenticated, service_role;
alter extension citext set schema extensions;

-- ---------------------------------------------------------------------------
-- 4) pages write policies: require custom JWT (current_user_id)
-- ---------------------------------------------------------------------------
drop policy if exists pages_insert on public.pages;
create policy pages_insert on public.pages
  for insert
  with check (public.current_user_id() is not null);

drop policy if exists pages_update on public.pages;
create policy pages_update on public.pages
  for update
  using (public.current_user_id() is not null)
  with check (public.current_user_id() is not null);

-- ---------------------------------------------------------------------------
-- 5) profiles_insert: no client inserts (register uses service_role)
-- ---------------------------------------------------------------------------
drop policy if exists profiles_insert on public.profiles;

-- ---------------------------------------------------------------------------
-- 6) avatars: drop broad SELECT listing; owners keep path-scoped SELECT for upsert
-- ---------------------------------------------------------------------------
drop policy if exists avatars_public_read on storage.objects;

drop policy if exists avatars_owner_select on storage.objects;
create policy avatars_owner_select on storage.objects
  for select
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_user_id()::text
  );

-- ---------------------------------------------------------------------------
-- 7) SECURITY DEFINER execute grants + rate-limit binding to session
-- ---------------------------------------------------------------------------

-- Triggers / internal: not callable via PostgREST
revoke all on function public.notify_on_reply() from public;
revoke all on function public.notify_on_reply() from anon, authenticated;
revoke all on function public.recompute_message_votes() from public;
revoke all on function public.recompute_message_votes() from anon, authenticated;

revoke all on function public.purge_empty_tombstone(uuid) from public;
revoke all on function public.purge_empty_tombstone(uuid) from anon, authenticated;
grant execute on function public.purge_empty_tombstone(uuid) to service_role;

-- Username helpers: only edge/service_role (register flow); not public RPCs
revoke all on function public.check_username_available(text, text) from public;
revoke all on function public.check_username_available(text, text) from anon, authenticated;
grant execute on function public.check_username_available(text, text) to service_role;

revoke all on function public.reserve_username(text, text) from public;
revoke all on function public.reserve_username(text, text) from anon, authenticated;
grant execute on function public.reserve_username(text, text) to service_role;

revoke all on function public.release_username(text, text) from public;
revoke all on function public.release_username(text, text) from anon, authenticated;
grant execute on function public.release_username(text, text) to service_role;

-- Authenticated app RPCs (custom JWT role = authenticated)
create or replace function public.check_rate_limit(
  p_user_id uuid,
  p_action text,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  w timestamptz := date_trunc('minute', now());
  c integer;
  uid uuid := public.current_user_id();
begin
  if uid is null or p_user_id is distinct from uid then
    raise exception 'Not authenticated';
  end if;

  insert into public.rate_limits (user_id, action, window_start, count)
  values (p_user_id, p_action, w, 1)
  on conflict (user_id, action, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into c;

  return c <= p_limit;
end;
$$;

revoke all on function public.check_rate_limit(uuid, text, integer) from public;
revoke all on function public.check_rate_limit(uuid, text, integer) from anon;
grant execute on function public.check_rate_limit(uuid, text, integer)
  to authenticated, service_role;

revoke all on function public.delete_own_message(uuid) from public;
revoke all on function public.delete_own_message(uuid) from anon;
grant execute on function public.delete_own_message(uuid)
  to authenticated, service_role;
