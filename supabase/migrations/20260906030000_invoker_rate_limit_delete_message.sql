-- Clear lint 0029: authenticated must not EXECUTE SECURITY DEFINER RPCs.
-- Switch check_rate_limit + delete_own_message to SECURITY INVOKER with RLS.
-- Rate-limit writes stay cheat-resistant via an increment-only trigger.
-- Parent tombstone purge moves to an AFTER DELETE DEFINER trigger (not RPC).

-- ---------------------------------------------------------------------------
-- 1) rate_limits: own-row RLS + force increment (clients cannot reset counts)
-- ---------------------------------------------------------------------------
drop policy if exists rate_limits_deny on public.rate_limits;

create policy rate_limits_select on public.rate_limits
  for select
  using (user_id = public.current_user_id());

create policy rate_limits_insert on public.rate_limits
  for insert
  with check (user_id = public.current_user_id());

create policy rate_limits_update on public.rate_limits
  for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

create or replace function public.rate_limits_force_increment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.count := 1;
    return new;
  end if;

  -- Ignore client-supplied count / identity columns on update.
  new.user_id := old.user_id;
  new.action := old.action;
  new.window_start := old.window_start;
  new.count := old.count + 1;
  return new;
end;
$$;

drop trigger if exists rate_limits_force_increment on public.rate_limits;
create trigger rate_limits_force_increment
  before insert or update on public.rate_limits
  for each row
  execute function public.rate_limits_force_increment();

revoke all on function public.rate_limits_force_increment() from public;
revoke all on function public.rate_limits_force_increment() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2) check_rate_limit: bind to JWT sub only; hardcoded limits; SECURITY INVOKER
-- ---------------------------------------------------------------------------
drop function if exists public.check_rate_limit(uuid, text, integer);

create or replace function public.check_rate_limit(p_action text)
returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  w timestamptz := date_trunc('minute', now());
  c integer;
  uid uuid := public.current_user_id();
  lim integer;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  lim := case p_action
    when 'post' then 10
    when 'vote' then 60
    else null
  end;

  if lim is null then
    raise exception 'Invalid rate limit action';
  end if;

  insert into public.rate_limits (user_id, action, window_start, count)
  values (uid, p_action, w, 1)
  on conflict (user_id, action, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into c;

  return c <= lim;
end;
$$;

revoke all on function public.check_rate_limit(text) from public;
revoke all on function public.check_rate_limit(text) from anon;
grant execute on function public.check_rate_limit(text)
  to authenticated, service_role;

comment on function public.check_rate_limit(text) is
  'Increment per-user per-minute counter for post|vote; returns whether under server-side limit. Uses JWT sub via current_user_id().';

-- ---------------------------------------------------------------------------
-- 3) votes: authors can clear votes when tombstoning their message
-- ---------------------------------------------------------------------------
drop policy if exists votes_delete_as_message_author on public.votes;
create policy votes_delete_as_message_author on public.votes
  for delete
  using (
    exists (
      select 1
      from public.messages m
      where m.id = votes.message_id
        and m.author_id = public.current_user_id()
    )
  );

-- ---------------------------------------------------------------------------
-- 4) Parent tombstone purge via AFTER DELETE (DEFINER trigger, not RPC)
-- ---------------------------------------------------------------------------
create or replace function public.purge_empty_tombstone(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_deleted_at timestamptz;
  has_children boolean;
begin
  select deleted_at
    into v_deleted_at
  from public.messages
  where id = p_message_id
  for update;

  if not found then
    return;
  end if;

  if v_deleted_at is null then
    return;
  end if;

  select exists(
    select 1 from public.messages where parent_id = p_message_id
  ) into has_children;

  if has_children then
    return;
  end if;

  -- Deleting this row fires trg_messages_purge_parent_tombstone for its parent.
  delete from public.messages where id = p_message_id;
end;
$$;

revoke all on function public.purge_empty_tombstone(uuid) from public;
revoke all on function public.purge_empty_tombstone(uuid) from anon, authenticated;
grant execute on function public.purge_empty_tombstone(uuid) to service_role;

create or replace function public.trg_messages_purge_parent_tombstone()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.parent_id is not null then
    perform public.purge_empty_tombstone(old.parent_id);
  end if;
  return old;
end;
$$;

drop trigger if exists trg_messages_purge_parent_tombstone on public.messages;
create trigger trg_messages_purge_parent_tombstone
  after delete on public.messages
  for each row
  execute function public.trg_messages_purge_parent_tombstone();

revoke all on function public.trg_messages_purge_parent_tombstone() from public;
revoke all on function public.trg_messages_purge_parent_tombstone() from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5) delete_own_message: SECURITY INVOKER; ownership via RLS + author_id check
-- ---------------------------------------------------------------------------
create or replace function public.delete_own_message(p_message_id uuid)
returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := public.current_user_id();
  has_children boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  perform 1
  from public.messages
  where id = p_message_id
    and author_id = uid
  for update;

  if not found then
    raise exception 'Message not found';
  end if;

  select exists(
    select 1 from public.messages where parent_id = p_message_id
  ) into has_children;

  if has_children then
    update public.messages
    set
      body = '',
      gif_url = null,
      deleted_at = coalesce(deleted_at, now()),
      score = 0,
      upvotes = 0,
      downvotes = 0
    where id = p_message_id
      and author_id = uid;

    delete from public.votes where message_id = p_message_id;

    return 'tombstone';
  end if;

  -- AFTER DELETE trigger purges empty parent tombstones.
  delete from public.messages
  where id = p_message_id
    and author_id = uid;

  return 'deleted';
end;
$$;

revoke all on function public.delete_own_message(uuid) from public;
revoke all on function public.delete_own_message(uuid) from anon;
grant execute on function public.delete_own_message(uuid)
  to authenticated, service_role;

comment on function public.delete_own_message(uuid) is
  'Author hard-deletes message content (SECURITY INVOKER + RLS). Removes the row when leaf; otherwise keeps id with empty body/gif and deleted_at set.';
