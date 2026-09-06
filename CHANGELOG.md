# Changelog

All notable changes to Everchat are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-06

First public release of Everchat: a Chrome side panel for anonymous public
comments on any URL.

### Added

- Chrome MV3 side panel (Chat, Explore, Notifications, Profile, Settings)
- Passkey-only auth (no email); claim a handle to speak, read without an account
- Nested replies, votes, karma, and community collapse of low-signal posts
- Explore (trending / new rooms) on the extension and [everch.at](https://everch.at)
- Reply notifications (in-panel + Chrome) that deep-link to the message
- ~50 UI locales, optional on-demand translation, RTL chrome
- Theme preference (system / light / dark)
- Room history navigation and live typing indicators
- Composer: text, emoji, GIF insert (proxied)
- MIT license, contributor docs, and GitHub Release zips for local install

### Security

- Supabase RLS, invoker-safe RPCs, and WebAuthn edge functions
- No third-party analytics pixels; donations via Open Collective
