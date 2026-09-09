-- Browse / All chats: rooms that actually have a conversation.
-- Opening the side panel upserts `pages` before anyone comments, so listing
-- `pages` directly fills the directory with empty New Tab / search / product
-- URLs. Match Explore "New": only pages with 1+ non-deleted messages.
-- `post_count` is all-time live posts (including replies). Trending still
-- ranks by last-24h `message_count`.

create index if not exists messages_alive_page_created_idx
  on public.messages (page_id, created_at desc)
  where deleted_at is null;

create or replace view public.active_pages
with (security_invoker = true)
as
select
  p.id,
  p.canonical_url,
  p.url,
  p.title,
  p.description,
  p.favicon_url,
  count(m.id)::integer as message_count,
  count(m.id)::integer as post_count,
  max(m.created_at) as last_active_at
from public.pages p
join public.messages m on m.page_id = p.id
where m.deleted_at is null
group by p.id
having count(m.id) > 0;

grant select on public.active_pages to anon, authenticated;

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
  count(m.id)::integer as message_count,
  (
    select count(*)::integer
    from public.messages m2
    where m2.page_id = p.id
      and m2.deleted_at is null
  ) as post_count
from public.pages p
join public.messages m on m.page_id = p.id
where m.created_at >= now() - interval '24 hours'
  and m.deleted_at is null
group by p.id
having count(m.id) > 0
order by count(m.id) desc;

grant select on public.trending_pages to anon, authenticated;
