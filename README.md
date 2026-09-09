# Everchat

**Every URL deserves a conversation.**

Everchat is a Chrome side-panel extension for anonymous public comments on any page. Open it on a news article, a government doc, a product page: same URL, same room. You never leave the tab.

No email. No ads. No third-party trackers. Free forever.

[![License: source-available](https://img.shields.io/badge/license-source--available-slate.svg)](./LICENSE)
[![GitHub release](https://img.shields.io/github/v/release/erikfiala/everchat?include_prereleases&sort=semver)](https://github.com/erikfiala/everchat/releases/latest)
[![GitHub stars](https://img.shields.io/github/stars/erikfiala/everchat)](https://github.com/erikfiala/everchat/stargazers)

**Site:** [everch.at](https://everch.at)  
**Themes:** [everch.at/themes](https://everch.at/themes)  
**Donate:** [buymeacoffee.com/everchat](https://buymeacoffee.com/everchat)  
**Releases:** [github.com/erikfiala/everchat/releases](https://github.com/erikfiala/everchat/releases)

## Why

Web pages have no portable conversation layer. Discussion ends up on Twitter, Reddit, or siloed site comments, disconnected from the page you are actually reading. Everchat puts the thread back on the URL.

## What you get

- **Public comments on any URL** bound to a canonical page identity
- **Read without an account**; speak after claiming a handle
- **Passkeys only** (no email, password, or OAuth)
- **Nested replies**, votes, and community collapse (no staff moderators)
- **Explore** trending and new chats across the web
- **Notifications** that deep-link back to the message on that page

## Themes

Browse, build, and import Themes at [https://everch.at/themes](https://everch.at/themes).

## Install

**Chrome Web Store** — coming soon. Check [everch.at](https://everch.at) for the official listing when it is live.

Until then, install an **official GitHub Release** zip. That is the build we publish.

1. Download `everchat-<version>-chrome.zip` from the [latest release](https://github.com/erikfiala/everchat/releases/latest)
2. Unzip it. The folder must contain `manifest.json`
3. Open `chrome://extensions` → enable **Developer mode**
4. **Load unpacked** → select that folder
5. Pin Everchat and open the side panel on any page

Chrome will warn that the extension is unpacked. That is expected until the Web Store listing is live.

Do not load a copy you built or modified yourself except to review the source or test a contribution. See [LICENSE](./LICENSE).

## Support

Everchat stays free. Voluntary donations go through [Buy Me a Coffee](https://buymeacoffee.com/everchat). Donations do not buy ranking, visibility, or special treatment.

## License

[Everchat Source-Available License](./LICENSE). Source is public so you can inspect it, verify official builds, follow the [changelog](./CHANGELOG.md), and send contributions. It is not open source: you may not distribute Everchat as your own product, publish modified builds, or run it as a substitute service.

The name, logos, and everch.at are reserved. See [TRADEMARK.md](./TRADEMARK.md).

By contributing, you agree to the inbound grant in the LICENSE. See [CONTRIBUTING.md](./CONTRIBUTING.md), [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md), and [GOVERNANCE.md](./GOVERNANCE.md).

## For contributors

Stack: WXT + React + TypeScript, Supabase, static `www/` on Vercel (passkey RP at [everch.at](https://everch.at)).

The Vercel project `everchat-www` must use **Root Directory `www`**. If that is left at `.`, Git deploys build the Chrome extension instead of the landing site and [everch.at](https://everch.at) returns `NOT_FOUND`.

Official builds use the committed public Supabase URL + anon key (RLS is the access control). Local backend overrides for contribution testing go in `.env.local` — see `.env.example`.

How to build a working copy, run tests, and send a pull request: [CONTRIBUTING.md](./CONTRIBUTING.md). Product detail lives in [PRD.md](./PRD.md).
