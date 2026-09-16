-- Durable cache of per-message translations (message + target locale).
-- Reads follow messages visibility; writes are service_role only (translate edge).

create table public.message_translations (
  message_id uuid not null references public.messages(id) on delete cascade,
  locale text not null,
  body text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, locale),
  constraint message_translations_locale_len check (
    char_length(locale) between 2 and 35
  )
);

comment on table public.message_translations is
  'Cached translation of a message body for one locale. Unique on (message_id, locale). Cleared on hard delete (FK cascade) and on tombstone (body cleared). Messages are not editable.';

alter table public.message_translations enable row level security;

-- Anyone who can read the message can read its cached translations.
create policy message_translations_select on public.message_translations
  for select
  using (
    exists (
      select 1 from public.messages m
      where m.id = message_id
    )
  );

grant select on public.message_translations to anon, authenticated, service_role;
grant insert, update, delete on public.message_translations to service_role;
revoke insert, update, delete on public.message_translations from public;
revoke insert, update, delete on public.message_translations from anon, authenticated;

-- Messages have no edit path. The only UPDATE of messages.body is
-- delete_own_message tombstone (body → ''). Hard delete uses FK CASCADE.
-- SECURITY DEFINER: authors have no DELETE policy on this table.
create or replace function public.trg_message_translations_invalidate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Tombstone (or any body rewrite): drop cached translations of the old text.
  if new.body is distinct from old.body then
    delete from public.message_translations where message_id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_message_translations_invalidate on public.messages;
create trigger trg_message_translations_invalidate
  after update of body on public.messages
  for each row
  execute function public.trg_message_translations_invalidate();

revoke all on function public.trg_message_translations_invalidate() from public;
revoke all on function public.trg_message_translations_invalidate() from anon, authenticated;
