-- Paginate the ranked list (20 at a time, cap 100) without dropping the pinned
-- caller row. Window ranks stay global; LIMIT/OFFSET only slice the result.

drop function if exists public.leaderboard();

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
security definer
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
