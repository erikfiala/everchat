-- Owners may rename their own passkeys (device_label only).
-- Login/register still update counters via service_role.

create policy webauthn_update on public.webauthn_credentials
  for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

revoke update on table public.webauthn_credentials from anon, authenticated;
grant update (device_label) on table public.webauthn_credentials to authenticated;
