-- Persist the original navigable href (tab.url / location.href) next to
-- canonical_url (scheme-less host+path identity). Activity / Explore reopen
-- this column so chrome-internal keys are not reconstructed as https://extensions
-- or chrome://extensions/#ec-msg-….

alter table public.pages
  add column if not exists url text;

comment on column public.pages.url is
  'Original page href when the room was created. Used to reopen the real browsing context.';

-- Recreate trending so clients can open the stored href.
drop view if exists public.trending_pages;

create view public.trending_pages
with (security_invoker = true)
as
select
  p.id,
  p.canonical_url,
  p.url,
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

-- New reply notifications should deep-link to the stored original href.
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
  open_url text;
  canon_host text;
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

  if page_row.url is not null and page_row.url ~* '^[a-z][a-z0-9+.-]*:' then
    open_url := page_row.url;
  elsif page_row.canonical_url ~* '^[a-z][a-z0-9+.-]*://' then
    open_url := page_row.canonical_url;
  else
    canon_host := split_part(split_part(page_row.canonical_url, '/', 1), '?', 1);
    if canon_host ~* '^localhost(:|$)' or position('.' in canon_host) > 0 then
      open_url := 'https://' || page_row.canonical_url;
    else
      open_url := 'chrome://' || page_row.canonical_url;
    end if;
  end if;

  insert into public.notifications (
    recipient_id, actor_id, message_id, parent_id, page_id, page_url, body_preview
  ) values (
    parent_author,
    new.author_id,
    new.id,
    new.parent_id,
    new.page_id,
    open_url,
    preview
  );

  return new;
end;
$$;
