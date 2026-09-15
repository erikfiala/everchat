# Changelog

All notable changes to Everchat are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.3] - 2026-09-15

### Added

- Webapp deep links: short `everch.at/app/p/{pageId}` (+ `/m/{messageId}`); legacy `?url=` / `?msg=` still work before a page row exists; share on `/app` prefers the short form
- `pages` rows are created on first post only (viewing a room no longer upserts)

### Changed

- Presence skips URLs with no `pages` row yet
- `/app` URL header aligns with the extension title+URL chrome (view/edit/Go/X modes, locale strings)
- Marketing site: remove preview bar; quieter hero preview link (SVG arrow, text underline)

### Fixed

- Favicons on the extension and `/chats`: host fallback, no Google s2 double-wrap
- Logout / edit / X icon hitboxes aligned with TopNav

## [1.0.2] - 2026-09-15

### Added

- Mobile web client at [everch.at/app](https://everch.at/app) (and `/chat`): paste a page URL, join that room, add to home screen
- Marketing “Try Everchat on Mobile” sheet on small screens linking to `/app`
- Theme remix, sitemap index for public pages and themes

### Changed

- Chrome Web Store listing is the primary install path; site and README point there
- Theme gallery cards: byline under the title; like / Remix / Import on one row
- Omit the extension `key` from Chrome Web Store zips so store upload is accepted

### Fixed

- Allow the Chrome Web Store extension origin for passkeys (store ID differs from unpacked builds)
- Signup and add-device passkeys wait up to 120s so phone QR ceremonies are not aborted early
- Dark theme previews use the skin palette instead of default zinc

## [1.0.0] - 2026-09-09

First public release of Everchat: a Chrome side panel for anonymous public
comments on any URL.

### Added

- Chrome MV3 side panel (Chat, Explore, Notifications, Profile, Settings)
- Passkey-only auth (no email); claim a handle to speak, read without an account
- Nested replies, votes, karma, and community collapse of low-signal posts
- Authors cannot vote on their own posts (handle or account id)
- Explore (trending / new rooms) on the extension and [everch.at](https://everch.at)
- Reply notifications (in-panel + Chrome) that deep-link to the message
- ~50 UI locales, optional on-demand translation, RTL chrome
- Theme preference (system / light / dark)
- Importable themes: dual light/dark palettes and allowlisted icon packs; Theme sits under Language in Settings until a skin is imported
- Theme builder at everch.at/themes/new, public gallery at /themes, and Import to Everchat via the extension
- Theme preview iframes the real side panel UI and updates live from tokens; typeface field is labeled Font
- Room history navigation and live typing indicators
- Composer: text, emoji, GIF insert (proxied)
- Contributor docs and GitHub Release zips for local install
- Also on [everch.at](https://everch.at): /chats directory, Support (Buy Me a Coffee), Themes, GitHub

### Changed

- Everchat Source-Available License: inspect, verify, contribute, and
  install official releases; no redistributing Everchat as your own
  product. Trademark policy in TRADEMARK.md.
- Privacy copy says Everchat has no trackers (not “no third-party trackers”)

### Security

- Supabase RLS, invoker-safe RPCs, and WebAuthn edge functions
- Theme skins apply through a constructed stylesheet so CSP `style-src` still holds
- Release zip build patches transitive adm-zip 0.6.0 so extraction refuses destination symlinks
- No analytics pixels; support via Buy Me a Coffee
