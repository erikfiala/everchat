-- Hard delete: purge message content. Keep a content-empty tombstone only when
-- replies still need the row for thread structure. Display as "Deleted comment."

alter table public.messages drop constraint if exists body_or_gif;

-- Scrub any prior soft-delete rows that still held placeholder body text
update public.messages
set body = '', gif_url = null
where deleted_at is not null
  and (body <> '' or gif_url is not null);

alter table public.messages add constraint body_or_gif check (
  deleted_at is not null
  or char_length(body) > 0
  or gif_url is not null
);

-- Author hard-delete (row removal when no children)
drop policy if exists messages_delete on public.messages;
create policy messages_delete on public.messages for delete
  using (author_id = public.current_user_id());

-- Recursively remove empty tombstones after a leaf is hard-deleted
create or replace function public.purge_empty_tombstone(p_message_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parent_id uuid;
  v_deleted_at timestamptz;
  has_children boolean;
begin
  select parent_id, deleted_at
    into v_parent_id, v_deleted_at
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

  delete from public.messages where id = p_message_id;

  if v_parent_id is not null then
    perform public.purge_empty_tombstone(v_parent_id);
  end if;
end;
$$;

-- Delete own message: hard-delete content. Tombstone (no body/media) only if
-- children still reference this id; otherwise remove the row entirely.
create or replace function public.delete_own_message(p_message_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := public.current_user_id();
  v_parent_id uuid;
  has_children boolean;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select parent_id into v_parent_id
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
    where id = p_message_id;

    delete from public.votes where message_id = p_message_id;

    return 'tombstone';
  end if;

  delete from public.messages where id = p_message_id;

  if v_parent_id is not null then
    perform public.purge_empty_tombstone(v_parent_id);
  end if;

  return 'deleted';
end;
$$;

revoke all on function public.delete_own_message(uuid) from public;
grant execute on function public.delete_own_message(uuid) to anon, authenticated, service_role;

revoke all on function public.purge_empty_tombstone(uuid) from public;
grant execute on function public.purge_empty_tombstone(uuid) to service_role;

comment on function public.delete_own_message(uuid) is
  'Author hard-deletes message content. Removes the row when leaf; otherwise keeps id with empty body/gif and deleted_at set.';
