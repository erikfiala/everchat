-- Everchat v1 schema: profiles, pages, messages, votes, notifications, WebAuthn, RLS

-- Extensions
create extension if not exists "pgcrypto";
create extension if not exists "citext";

-- Profiles
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  username citext not null unique,
  avatar_url text,
  karma integer not null default 0,
  created_at timestamptz not null default now(),
  constraint username_format check (username ~ '^[a-z0-9_]{3,20}$')
);

create index profiles_username_idx on public.profiles (username);

-- WebAuthn credentials (credential_id / public_key stored as base64url text)
create table public.webauthn_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  credential_id text not null unique,
  public_key text not null,
  sign_count bigint not null default 0,
  transports text[],
  device_label text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index webauthn_credentials_user_id_idx on public.webauthn_credentials (user_id);

-- Short-lived username reservations during passkey ceremony
create table public.username_reservations (
  username citext primary key,
  reserved_until timestamptz not null,
  session_token text not null
);

-- Pages (canonical URL identity)
create table public.pages (
  id uuid primary key default gen_random_uuid(),
  canonical_url text not null unique,
  title text,
  description text,
  favicon_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Messages
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  page_id uuid not null references public.pages(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.messages(id) on delete set null,
  body text not null default '',
  gif_url text,
  score integer not null default 0,
  upvotes integer not null default 0,
  downvotes integer not null default 0,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint body_or_gif check (char_length(body) > 0 or gif_url is not null),
  constraint body_max check (char_length(body) <= 2000)
);

create index messages_page_parent_created_idx
  on public.messages (page_id, parent_id, created_at);
create index messages_page_score_idx
  on public.messages (page_id, score desc, created_at desc);
create index messages_author_created_idx
  on public.messages (author_id, created_at desc);

-- Votes
create table public.votes (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  primary key (message_id, user_id)
);

-- Reports (store-only; no admin UI in v1)
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason text,
  created_at timestamptz not null default now()
);

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  message_id uuid not null references public.messages(id) on delete cascade,
  parent_id uuid not null references public.messages(id) on delete cascade,
  page_id uuid not null references public.pages(id) on delete cascade,
  page_url text not null,
  body_preview text not null default '',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index notifications_unread_idx
  on public.notifications (recipient_id)
  where read_at is null;

-- Rate limits
create table public.rate_limits (
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  window_start timestamptz not null default date_trunc('minute', now()),
  count integer not null default 0,
  primary key (user_id, action, window_start)
);

-- WebAuthn challenge store (ephemeral)
create table public.webauthn_challenges (
  id text primary key,
  challenge text not null,
  user_id uuid references public.profiles(id) on delete cascade,
  username citext,
  expires_at timestamptz not null
);

-- ============================================================================
-- Vote aggregates + karma (exclude self-votes from karma)
-- ============================================================================
create or replace function public.recompute_message_votes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  mid uuid;
  author uuid;
  old_val smallint := 0;
  new_val smallint := 0;
  up_c int;
  down_c int;
begin
  mid := coalesce(new.message_id, old.message_id);

  select author_id into author from public.messages where id = mid;

  if tg_op = 'DELETE' then
    old_val := old.value;
    new_val := 0;
  elsif tg_op = 'INSERT' then
    old_val := 0;
    new_val := new.value;
  else
    old_val := old.value;
    new_val := new.value;
  end if;

  select
    coalesce(sum(case when value = 1 then 1 else 0 end), 0),
    coalesce(sum(case when value = -1 then 1 else 0 end), 0)
  into up_c, down_c
  from public.votes
  where message_id = mid;

  update public.messages
  set
    upvotes = up_c,
    downvotes = down_c,
    score = up_c - down_c
  where id = mid;

  -- Karma: only non-self votes
  if author is not null then
    if tg_op = 'DELETE' then
      if old.user_id <> author then
        update public.profiles set karma = karma - old.value where id = author;
      end if;
    elsif tg_op = 'INSERT' then
      if new.user_id <> author then
        update public.profiles set karma = karma + new.value where id = author;
      end if;
    else
      if new.user_id <> author then
        update public.profiles
        set karma = karma - old.value + new.value
        where id = author;
      end if;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

create trigger votes_recompute
after insert or update or delete on public.votes
for each row execute function public.recompute_message_votes();

-- Notify parent author on reply
create or replace function public.notify_on_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_author uuid;
  page_row public.pages%rowtype;
  preview text;
begin
  if new.parent_id is null then
    return new;
  end if;

  select author_id into parent_author from public.messages where id = new.parent_id;
  if parent_author is null or parent_author = new.author_id then
    return new;
  end if;

  select * into page_row from public.pages where id = new.page_id;

  preview := left(coalesce(nullif(trim(new.body), ''), '[GIF]'), 140);

  insert into public.notifications (
    recipient_id, actor_id, message_id, parent_id, page_id, page_url, body_preview
  ) values (
    parent_author,
    new.author_id,
    new.id,
    new.parent_id,
    new.page_id,
    'https://' || page_row.canonical_url,
    preview
  );

  return new;
end;
$$;

create trigger messages_notify_reply
after insert on public.messages
for each row execute function public.notify_on_reply();

-- Username helpers
create or replace function public.check_username_available(p_username text)
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
    where username = u and reserved_until >= now()
  ) then
    return false;
  end if;
  return true;
end;
$$;

create or replace function public.reserve_username(p_username text, p_session_token text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  u citext := lower(p_username);
begin
  if not public.check_username_available(u) then
    return false;
  end if;
  insert into public.username_reservations (username, reserved_until, session_token)
  values (u, now() + interval '15 minutes', p_session_token)
  on conflict (username) do update
  set reserved_until = excluded.reserved_until,
      session_token = excluded.session_token
  where public.username_reservations.reserved_until < now();
  return exists (
    select 1 from public.username_reservations
    where username = u and session_token = p_session_token
  );
end;
$$;

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
begin
  insert into public.rate_limits (user_id, action, window_start, count)
  values (p_user_id, p_action, w, 1)
  on conflict (user_id, action, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into c;

  return c <= p_limit;
end;
$$;

-- Trending view: messages in last 24h
create or replace view public.trending_pages as
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

-- Auth helper: custom JWT claims via request headers
-- Edge functions mint JWTs with sub = profile id; PostgREST sets request.jwt.claim.sub
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '')::uuid;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.webauthn_credentials enable row level security;
alter table public.username_reservations enable row level security;
alter table public.pages enable row level security;
alter table public.messages enable row level security;
alter table public.votes enable row level security;
alter table public.reports enable row level security;
alter table public.notifications enable row level security;
alter table public.rate_limits enable row level security;
alter table public.webauthn_challenges enable row level security;

-- Profiles: public read; owner update
create policy profiles_select on public.profiles for select using (true);
create policy profiles_update on public.profiles for update
  using (id = public.current_user_id());
create policy profiles_insert on public.profiles for insert
  with check (true); -- service role / edge typically inserts; allow for custom JWT path

-- Credentials: owner only
create policy webauthn_select on public.webauthn_credentials for select
  using (user_id = public.current_user_id());
create policy webauthn_delete on public.webauthn_credentials for delete
  using (user_id = public.current_user_id());
-- Inserts via service role in edge functions

-- Reservations: no direct client access (edge uses service role)
create policy reservations_deny on public.username_reservations for all using (false);

-- Pages: public read; authenticated upsert
create policy pages_select on public.pages for select using (true);
create policy pages_insert on public.pages for insert
  with check (public.current_user_id() is not null);
create policy pages_update on public.pages for update
  using (public.current_user_id() is not null);

-- Also allow anon insert for page upsert when lurkers open chat (metadata only)
-- Prefer service/authenticated; allow insert for anyone so read path can create page rows
drop policy if exists pages_insert on public.pages;
create policy pages_insert on public.pages for insert with check (true);
drop policy if exists pages_update on public.pages;
create policy pages_update on public.pages for update using (true);

-- Messages: public read; auth insert; author soft-delete
create policy messages_select on public.messages for select using (true);
create policy messages_insert on public.messages for insert
  with check (author_id = public.current_user_id());
create policy messages_update on public.messages for update
  using (author_id = public.current_user_id());

-- Votes: auth own
create policy votes_select on public.votes for select
  using (user_id = public.current_user_id());
create policy votes_insert on public.votes for insert
  with check (user_id = public.current_user_id());
create policy votes_update on public.votes for update
  using (user_id = public.current_user_id());
create policy votes_delete on public.votes for delete
  using (user_id = public.current_user_id());

-- Reports
create policy reports_insert on public.reports for insert
  with check (reporter_id = public.current_user_id());
create policy reports_select on public.reports for select
  using (reporter_id = public.current_user_id());

-- Notifications: recipient only
create policy notifications_select on public.notifications for select
  using (recipient_id = public.current_user_id());
create policy notifications_update on public.notifications for update
  using (recipient_id = public.current_user_id());

-- Rate limits: no direct client
create policy rate_limits_deny on public.rate_limits for all using (false);

-- Challenges: deny client
create policy challenges_deny on public.webauthn_challenges for all using (false);

-- Realtime
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.notifications;

-- Storage bucket for avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy avatars_public_read on storage.objects for select
  using (bucket_id = 'avatars');
create policy avatars_owner_upload on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_user_id()::text
  );
create policy avatars_owner_update on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_user_id()::text
  );
create policy avatars_owner_delete on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = public.current_user_id()::text
  );

-- Grant execute on helpers
grant execute on function public.check_username_available(text) to anon, authenticated;
grant execute on function public.reserve_username(text, text) to anon, authenticated;
grant execute on function public.check_rate_limit(uuid, text, integer) to authenticated;
grant select on public.trending_pages to anon, authenticated;
