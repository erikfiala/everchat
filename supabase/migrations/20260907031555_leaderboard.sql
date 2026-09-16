-- Leaderboard: index karma order + RPC returning top 100 and the caller’s row.
-- Only handle, avatar, karma, and rank — no emails or credentials.

create index if not exists profiles_karma_username_idx
  on public.profiles (karma desc, username asc);

create or replace function public.leaderboard()
returns table (
  rank integer,
  username text,
  avatar_url text,
  karma integer,
  is_me boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select p.id, p.username, p.avatar_url, p.karma
    from public.profiles p
    where p.id = public.current_user_id()
  ),
  top as (
    select
      row_number() over (order by p.karma desc, p.username asc)::integer as rank,
      p.id,
      p.username::text as username,
      p.avatar_url,
      p.karma
    from public.profiles p
    order by p.karma desc, p.username asc
    limit 100
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

revoke all on function public.leaderboard() from public;
grant execute on function public.leaderboard() to anon, authenticated;
