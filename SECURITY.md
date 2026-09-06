# Security policy

## Supported versions

Please report issues against the latest release on
[GitHub Releases](https://github.com/everchathq/everchat/releases/latest)
and `main`.

## Reporting a vulnerability

**Do not open a public issue for security problems.**

Use [GitHub Private Vulnerability Reporting](https://github.com/everchathq/everchat/security/advisories/new).

Include:

- What you found and how to reproduce it
- Impact (who is affected, what an attacker could do)
- The Everchat version or commit

We will acknowledge the report and keep you updated while we investigate. Please
give us a reasonable window to ship a fix before public disclosure.

## Public vs secret

These values are **meant to be public** (they ship in the Chrome extension and
on [everch.at](https://everch.at)):

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (the Supabase anon / publishable key)
- The Chrome extension **public** key in `wxt.config.ts` (`manifest.key`), which
  pins the extension ID

Do **not** commit:

- Supabase **service role** keys
- `JWT_SECRET` / `SUPABASE_JWT_SECRET`
- Edge Function secrets (`GIPHY_API_KEY`, `TRANSLATE_API_KEY`, …)
- The Chrome extension **private** `.pem` used to generate `manifest.key`

Row Level Security on Supabase is the real access control for the anon key.
If you find an RLS bypass, treat it as a security report.

## Scope notes

Everchat stores public comments, handles, votes, and passkey credentials. There
is no email login. Account recovery is additional passkeys only — that is
intentional, not a bug.
