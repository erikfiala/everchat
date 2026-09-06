# Everchat

**Every URL deserves a conversation.**

Everchat is a Chrome side-panel extension for anonymous public comments on any page. Open it on a news article, a government doc, a product page: same URL, same room. You never leave the tab.

No email. No ads. No third-party trackers. Free forever.

[![License: MIT](https://img.shields.io/badge/license-MIT-slate.svg)](./LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/everchathq/everchat?include_prereleases&sort=semver)](https://github.com/everchathq/everchat/releases/latest)

**Site:** [everch.at](https://everch.at)  
**Donate:** [opencollective.com/everchat](https://opencollective.com/everchat)  
**Releases:** [github.com/everchathq/everchat/releases](https://github.com/everchathq/everchat/releases)

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

**Chrome Web Store** — coming soon. Check [everch.at](https://everch.at) for the official listing when it is live.

### From a GitHub release (recommended)

No Node toolchain. This is the build we publish.

1. Download `everchat-<version>-chrome.zip` from the [latest release](https://github.com/everchathq/everchat/releases/latest)
2. Unzip it. The folder must contain `manifest.json`
3. Open `chrome://extensions` → enable **Developer mode**
4. **Load unpacked** → select that folder
5. Pin Everchat and open the side panel on any page

Chrome will warn that the extension is unpacked. That is expected until the Web Store listing is live.

### From source

```bash
git clone https://github.com/everchathq/everchat.git
cd everchat
pnpm install
pnpm build             # → dist/everchat
```

Then **Load unpacked** → `dist/everchat`. Details, tests, and release tagging are in [CONTRIBUTING.md](./CONTRIBUTING.md).

## Support

Everchat stays free. Voluntary donations go through [Open Collective](https://opencollective.com/everchat). Donations do not buy ranking, visibility, or special treatment.

## License

[MIT](./LICENSE). By contributing, you agree that your work is licensed under the same terms. See [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [GOVERNANCE.md](./GOVERNANCE.md).

## For developers

Stack: WXT + React + TypeScript, Supabase, static `www/` on Vercel (passkey RP at [everch.at](https://everch.at)).

The Vercel project `everchat-www` must use **Root Directory `www`**. If that is left at `.`, Git deploys build the Chrome extension instead of the landing site and [everch.at](https://everch.at) returns `NOT_FOUND`.

Official builds use the committed public Supabase URL + anon key (RLS is the access control). Self-hosting overrides go in `.env.local` — see `.env.example`.

Product detail lives in [PRD.md](./PRD.md). Edge secrets (WebAuthn, optional `TRANSLATE_API_KEY` / Giphy) are documented in `.env.example`.
