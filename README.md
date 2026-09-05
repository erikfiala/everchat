# Everchat

Chrome MV3 side-panel extension: public comments on any URL. Passkeys only. No email.

**Site / WebAuthn RP (canonical):** [everch.at](https://everch.at). `www.everch.at` redirects here (308).  
Product spec: [PRD.md](./PRD.md) (v1.9).

**Funding:** Voluntary donations via [Open Collective](https://opencollective.com/everchat) — see `.github/FUNDING.yml`.

## i18n

- **UI catalogs:** `lib/i18n/locales/*.json` (50 locales). Extension loads them via `useLocale()`; marketing site uses `www/locales/` (keep in sync with `pnpm locales:sync`).
- **Language switcher:** Chat toolbar next to Mode; preference `ec-locale` in `localStorage` + `chrome.storage.local` (`system` or a locale code). Switching language translates chrome/labels only — never post bodies.
- **RTL:** `document.documentElement.dir` follows the selected (or system) locale.
- **Message translation:** “See translation” under a comment calls the `translate` Edge Function (Google Cloud Translation). Cached in memory + `localStorage`.

## Stack

- **Extension:** WXT + React + TypeScript (Side Panel)
- **UI:** Tailwind + shadcn-style components, Inter, Lucide, Sonner
- **Backend:** Supabase (Postgres, Realtime, Storage) + Edge Functions (WebAuthn, Giphy)
- **Web:** Static `www/` on Vercel (landing + WebAuthn related-origins)

## Setup

### 1. Install

```bash
pnpm install
cp .env.example .env
```

### 2. Supabase

1. Create a Supabase project (or `supabase start` locally).
2. Link and apply migrations:

```bash
npx supabase link --project-ref YOUR_REF
npx supabase db push
```

Or with local:

```bash
npx supabase start
npx supabase db reset
```

3. Put project URL + anon key in `.env`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_WEBAUTHN_RP_ID=everch.at
VITE_WEBAUTHN_RP_NAME=Everchat
```

4. Set Edge Function secrets (JWT must match the project HS256 signing key used for Data API):

```bash
npx supabase secrets set \
  JWT_SECRET="<project HS256 JWT signing secret>" \
  WEBAUTHN_RP_ID="everch.at" \
  WEBAUTHN_RP_NAME="Everchat" \
  WEBAUTHN_ORIGIN="chrome-extension://<YOUR_EXTENSION_ID>,https://everch.at" \
  GIPHY_API_KEY="<optional>" \
  TRANSLATE_API_KEY="<optional Google Cloud Translation API key>"
```

`WEBAUTHN_ORIGIN` accepts a comma-separated list (SimpleWebAuthn `expectedOrigin`).

`TRANSLATE_API_KEY` (alias `GOOGLE_TRANSLATE_API_KEY`) powers per-message **See translation** in the side panel. Without it, the UI shows “Translation unavailable”. UI chrome translations ship as JSON catalogs and do not need this key.

5. Deploy functions:

```bash
npx supabase functions deploy webauthn-register
npx supabase functions deploy webauthn-login
npx supabase functions deploy webauthn-add-device
npx supabase functions deploy giphy-proxy
npx supabase functions deploy translate
```

### 3. Domain + WebAuthn (`everch.at`)

Passkey ceremonies run in the **side panel** (`chrome-extension://…`). RP ID is the brand domain `everch.at`, so Chrome needs [Related Origin Requests](https://github.com/w3c/webauthn/wiki/Explainer:-Related-origin-requests):

1. Deploy `www/` to Vercel project **everchat-www** (already seeded).
2. Domains on the project: **everch.at** (primary/canonical) and **www.everch.at** → 308 redirect to apex.
3. At your registrar, point DNS as Vercel shows (typical):

| Type | Name | Value |
|------|------|--------|
| **A** | `@` | `76.76.21.21` |
| **CNAME** | `www` | `cname.vercel-dns.com` |

(Confirm exact records in the Vercel domain UI - they can change. Apex must stay primary; do not reverse the www redirect.)

4. After DNS propagates, `https://everch.at/.well-known/webauthn` must return JSON listing the extension origin, e.g.:

```json
{
  "origins": [
    "chrome-extension://apoahddgobmmgdbjcphhelolagklgkil",
    "chrome-extension://mnncloenhbfhdiaffjmmgljfjcagigaj"
  ]
}
```

> **Extension ID note:** Unpacked IDs change if the path/key changes. After reload, check `chrome://extensions`, update `www/.well-known/webauthn` + `WEBAUTHN_ORIGIN`, redeploy site + edge secrets/functions if needed. **Never** put the extension ID in `WEBAUTHN_RP_ID` — that must stay `everch.at` (extension hosts are not valid WebAuthn RP domains).

### 4. Dev / build

```bash
pnpm dev      # hot reload
pnpm build    # production → dist/everchat
pnpm compile  # typecheck
pnpm zip      # Chrome Web Store zip
```

### 5. Load unpacked

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `dist/everchat` (or `dist/everchat-dev` while using `pnpm dev`)
4. Pin Everchat; click the icon to open the side panel on any tab

## Layout

```
entrypoints/background.ts      # tab binding, side panel open, notifications
entrypoints/sidepanel/         # React app
lib/canonicalize.ts            # URL identity + #ec-msg deep links
lib/auth/                      # session + WebAuthn client
components/                    # Chat, Auth, Notifs, Profile
supabase/migrations/           # schema, triggers, RLS
supabase/functions/            # webauthn-* + giphy-proxy + translate
lib/i18n/                      # locale catalogs + t() helpers
www/                           # everch.at landing + .well-known/webauthn + locales
```

## Product constants

- Community collapse: `downvotes / (up + down) ≥ 0.67` and total votes ≥ `3`
- Trending: pages with most messages in the last 24h
- CTA copy: **Sign in anonymously** (never “passkeys” on primary buttons)

## Gaps / required for full e2e

| Need | Why |
|---|---|
| Supabase project + migrations applied | All read/write |
| `JWT_SECRET` = project HS256 signing secret | Session JWT passes RLS as `authenticated` |
| `everch.at` DNS + `.well-known/webauthn` | Passkeys with RP ID `everch.at` from the extension |
| Extension ID in `WEBAUTHN_ORIGIN` + related-origins file | Side-panel ceremony origin |
| `GIPHY_API_KEY` | GIF search (optional; text posts work without it) |
| `TRANSLATE_API_KEY` | Per-message “See translation” (optional; UI shows unavailable without it) |

## Manual test checklist (PRD §17)

- [ ] Panel closed → no host injection
- [ ] Open panel → Chat loads for active tab
- [ ] Navigate tab → thread remounts
- [ ] Empty state copy
- [ ] Logged out: read OK; compose/vote/Notifs/Profile → auth landing
- [ ] Sign in anonymously → handle → passkey → toast
- [ ] Already joined? Unlock
- [ ] Post / reply with `@mention` / vote / hard-delete
- [ ] Community collapse stub + expand
- [ ] Notification → new tab `#ec-msg-…` → scroll + highlight
- [ ] Profile avatar, devices, activity deep link
- [ ] Emoji + Giphy (if key set)
