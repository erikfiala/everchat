-- Registration stores a pending user_id on the challenge before the profile
-- row exists. The FK to profiles blocked inserts (409) while the edge function
-- still returned options — verify then failed with "Ceremony expired".
-- Challenges are ephemeral; keep user_id as a nullable hint without FK.

alter table public.webauthn_challenges
  drop constraint if exists webauthn_challenges_user_id_fkey;
