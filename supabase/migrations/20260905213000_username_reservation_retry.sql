-- Allow registration retries after a failed/cancelled passkey ceremony.
-- Reservations are short-lived and may be overwritten by a new ceremony;
-- clients can also explicitly release their own reservation.

create or replace function public.reserve_username(p_username text, p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  u citext := lower(p_username);
begin
  if u !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;
  -- Only completed profiles permanently claim a handle. Active reservations
  -- may be overwritten so a cancelled/failed ceremony can retry immediately.
  if exists (select 1 from public.profiles where username = u) then
    return false;
  end if;
  delete from public.username_reservations where reserved_until < now();
  insert into public.username_reservations (username, reserved_until, session_token)
  values (u, now() + interval '5 minutes', p_session_token)
  on conflict (username) do update
  set reserved_until = excluded.reserved_until,
      session_token = excluded.session_token;
  return true;
end;
$$;

-- Own in-progress reservation counts as available (retry UX).
drop function if exists public.check_username_available(text);

create function public.check_username_available(
  p_username text,
  p_session_token text default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  u citext := lower(p_username);
begin
  if u !~ '^[a-z0-9_]{3,20}$' then
    return false;
  end if;
  if exists (select 1 from public.profiles where username = u) then
    return false;
  end if;
  delete from public.username_reservations where reserved_until < now();
  if exists (
    select 1 from public.username_reservations
    where username = u
      and reserved_until >= now()
      and (
        p_session_token is null
        or session_token is distinct from p_session_token
      )
  ) then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.release_username(
  p_username text,
  p_session_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  u citext := lower(p_username);
begin
  delete from public.username_reservations
  where username = u
    and session_token = p_session_token;
  return found;
end;
$$;

grant execute on function public.check_username_available(text, text) to anon, authenticated;
grant execute on function public.reserve_username(text, text) to anon, authenticated;
grant execute on function public.release_username(text, text) to anon, authenticated;
