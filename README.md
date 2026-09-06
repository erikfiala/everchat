# Everchat

**Every URL deserves a conversation.**

Everchat is a Chrome side-panel extension for anonymous public comments on any page. Open it on a news article, a government doc, a product page: same URL, same room. You never leave the tab.

No email. No ads. No third-party trackers. Free forever.

**Site:** [everch.at](https://everch.at)  
**Donate:** [opencollective.com/everchat](https://opencollective.com/everchat)

## Why

Web pages have no portable conversation layer. Discussion ends up on Twitter, Reddit, or siloed site comments, disconnected from the page you are actually reading. Everchat puts the thread back on the URL.

## What you get

- **Public comments on any URL** bound to a canonical page identity
- **Read without an account**; speak after claiming a handle
- **Passkeys only** (no email, password, or OAuth)
- **Nested replies**, votes, and community collapse (no staff moderators)
- **Explore** trending and new chats across the web
- **Notifications** that deep-link back to the message on that page

## Install

**Chrome Web Store** — coming soon. Check [everch.at](https://everch.at) for the official install link when it is live.

**From a local build** (developer mode):

1. `pnpm install && pnpm build`
2. Open `chrome://extensions` → enable Developer mode
3. Load unpacked → select `dist/everchat`
4. Pin Everchat and open the side panel on any page

## Support

Everchat stays free. Voluntary donations go through [Open Collective](https://opencollective.com/everchat). Donations do not buy ranking, visibility, or special treatment.

## For developers

Stack: WXT + React + TypeScript, Supabase, static `www/` on Vercel (passkey RP at [everch.at](https://everch.at)).

The Vercel project `everchat-www` must use **Root Directory `www`**. If that is left at `.`, Git deploys build the Chrome extension instead of the landing site and [everch.at](https://everch.at) returns `NOT_FOUND`.

```bash
pnpm install
cp .env.example .env   # add Supabase URL + anon key
pnpm build             # → dist/everchat
```

Product detail lives in [PRD.md](./PRD.md). Edge secrets (WebAuthn, optional `TRANSLATE_API_KEY` / Giphy) are documented in `.env.example`.
