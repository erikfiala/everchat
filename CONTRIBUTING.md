# Contributing to Everchat

Thanks for helping. Please read the [Code of Conduct](./CODE_OF_CONDUCT.md)
before opening an issue or pull request.

## What you need

- [Node.js](https://nodejs.org/) 20 or later (22 is what CI uses)
- [pnpm](https://pnpm.io/) 9 (`corepack enable` then `corepack prepare pnpm@9.15.4 --activate`)

The default build talks to the **production** Everchat backend. Public Supabase
URL + anon key live in `.env.development` and `.env.production` (safe to ship;
RLS is the access control). Copy `.env.example` to `.env.local` only if you are
self-hosting.

## Install the extension locally

**Easiest:** download a zip from
[GitHub Releases](https://github.com/erikfiala/everchat/releases/latest)
and follow the README. You do not need this repo for that.

**From source:**

```bash
git clone https://github.com/erikfiala/everchat.git
cd everchat
pnpm install
pnpm build          # → dist/everchat
```

Then in Chrome: `chrome://extensions` → Developer mode → **Load unpacked** →
select `dist/everchat`.

```bash
pnpm dev            # WXT watch build (reload the unpacked folder after changes)
pnpm test           # vitest
pnpm compile        # tsc --noEmit
pnpm zip            # dist/everchat-<version>-chrome.zip
```

## Marketing site (`www/`)

The Vercel project `everchat-www` must use **Root Directory `www`**.

```bash
pnpm --dir www install
pnpm --dir www build    # compiles www/src/input.css → www/styles.css
```

After changing locale strings in `lib/i18n/locales/`, sync them to the site:

```bash
pnpm locales:sync
```

English (`lib/i18n/locales/en.json`) is the source of truth. Other catalogs
fall back to English for missing keys.

## Pull requests

- Keep the change focused. Product intent lives in [PRD.md](./PRD.md).
- Run `pnpm test` and `pnpm compile` before you push.
- Do not commit `.env`, `.env.local`, service-role keys, or `*.pem`.
- UI copy: add keys to `lib/i18n/locales/en.json`. Translations in other
  locales are welcome but not required for a first PR.

## Releases (maintainers)

1. Bump `version` in `package.json`.
2. Add a section to [CHANGELOG.md](./CHANGELOG.md) (`## [x.y.z] - YYYY-MM-DD`).
3. Commit, then tag and push:

   ```bash
   git tag -a vX.Y.Z -m "vX.Y.Z"
   git push origin main --tags
   ```

4. The **Release** GitHub Action zips the Chrome extension and publishes
   [GitHub Releases](https://github.com/erikfiala/everchat/releases) with the
   changelog section plus generated commit notes.

Never put the Chrome Web Store upload private key in git. `wxt.config.ts`
already pins the **public** extension key so unpacked builds keep a stable ID.

## Self-hosting

You can point a private build at your own Supabase project with `.env.local`
(see `.env.example`). Edge Function secrets are set with
`supabase secrets set`, never in the extension. WebAuthn RP ID must be a real
domain you control, listed in `www/.well-known/webauthn` and `WEBAUTHN_ORIGIN`.
