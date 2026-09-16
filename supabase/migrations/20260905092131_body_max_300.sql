-- Tighten message body max from 2,000 → 300 characters.
alter table public.messages drop constraint if exists body_max;
alter table public.messages
  add constraint body_max check (char_length(body) <= 300);
