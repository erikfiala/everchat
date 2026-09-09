# Everchat - Product Requirements Document

**Version:** 2.0  
**Status:** Shipped (reflects current product)  
**Product:** Chrome MV3 side panel — public, Reddit-style comments on any URL; marketing site at [everch.at](https://everch.at)  
**Last updated:** 2026-09-06

---

## 1. Vision

Everchat attaches a public discussion to every web page. Open the right-hand side panel (same interaction pattern as Gemini or Claude) and you see the thread for *this* page. Anyone else on that same canonical URL can post, reply in unbounded nests, upvote/downvote, and build karma behind a claimed handle.

**One-liner:** Leave a tweet on any URL — and let the page become the thread.

**Positioning:** Privacy-first public commentary. **No email required.** Public identity is `@handle` + optional avatar. Auth is **passkeys only** (WebAuthn) so Everchat never holds an inbox identity — important for people commenting on sensitive / government pages. **No staff moderation** — the community collapses low-signal posts via downvotes (Reddit-style), always expandable.

---

## 2. Problem

Web pages have no native, portable conversation layer. Discourse lives on Twitter, Reddit, or closed site comments — disconnected from the page you are looking at. People browsing the same article, video, or product page cannot easily discuss it *on* that page without installing a heavy social product or trusting site-specific comment systems.

**Who feels this**

| Persona | Need |
|---|---|
| News / blog reader | React to an article with strangers who are also on that URL |
| Lurker | Read the vibe of a page before commenting |
| Opinionated commenter | Claim a handle, stack replies, earn (or lose) karma |
| Early adopter | Lightweight Chrome side panel; no account until they want to speak |

---

## 3. Goals and non-goals

### Goals (shipped)

- Side-panel discussion bound to a **canonical URL**
- Read without an account; write after **claiming a username** and registering a **passkey**
- Infinitely nested replies with auto `@mention` prefix on reply
- Upvote / downvote; message score and profile karma (self-votes excluded from karma)
- **No staff moderation** — community collapse when a message hits a majority-downvote threshold (Reddit-style; always expandable)
- Profiles: handle, optional avatar, karma (green / red); **Profile tab** with avatar upload, devices (passkeys), activity list
- **Top nav tabs:** Chat · Explore · Notifications · Profile · Settings (icon + tooltip)
- **Explore:** discovery of Trending / New rooms (extension + marketing site)
- **Chat chrome:** page context, Sort by Best/New, in-panel room history back/forward, typing indicators, composer
- **Settings:** Mode (System / Light / Dark) + Language (~50 locales)
- Composer: text, emoji picker, Giphy GIF insert (via Edge proxy)
- Per-message **See translation** (Edge Function → Google Translate when configured)
- **Reply notifications** (in-panel + Chrome OS) that open the page with the side panel focused on the reply (`#ec-msg-{id}`)
- Auth landing (value-led) with CTA **Sign up anonymously** (no email)
- Marketing site **everch.at**: hero, trending, install copy, legal, Buy Me a Coffee support
- Performant MV3 side panel (no host-page CSS leakage)
- Supabase backend with RLS, realtime messages + typing presence, Storage for avatars, custom WebAuthn Edge Functions

### Non-goals (current)

- Firefox / Safari
- Public web app for reading/posting comments (everch.at is marketing + trending discovery only — not SEO’d per-URL comment pages)
- DMs, follows, awards, emoji reactions, paid features
- Full moderation dashboard / admin UI / staff takedowns of speech
- Automod / keyword bans / shadowbans as default moderation (community votes only)
- Message editing after publish (posts are immutable once published; delete only)
- **Email / password / magic link / OTP / Google (or any social) OAuth** — privacy by design
- Email / push notifications outside the extension (Chrome extension notifications + in-panel inbox only)
- Account recovery via email (recovery = add a second passkey only)
- Chrome Web Store listing as the sole install path (CWS badge on www currently anchors to GitHub Releases / local-install instructions; store listing may come later)

### Funding / support

The product is free to use; no ads and no paid features that buy visibility or speech rights. Voluntary support goes through **Buy Me a Coffee** at [buymeacoffee.com/everchat](https://buymeacoffee.com/everchat) (wired in `.github/FUNDING.yml` and linked from everch.at). Payment details are processed by Buy Me a Coffee and its partners under their own policies; Everchat does not receive card numbers. Support does not buy preferential ranking, viewpoint protection, or special treatment.

---

## 4. Conversion (the product bet)

Signup is not “create an account” and not “sign in with passkeys.” It is **join anonymously**: claim a handle, lock it with a passkey under the hood. No email step. Passkeys are the mechanism; the product language is anonymity and speech.

```
Install → browse any page → read thread (no account)
        → first write/vote OR open Notifications / Profile while logged out
        → Auth landing (value, not features)
        → Primary CTA: “Sign up anonymously”
            → tries existing passkey first
            → if none / cancel → Claim @handle → passkey ceremony
        → Write unlocked
```

### Auth landing (logged-out gate)

Shown when write/vote is gated, or when **Notifications** / **Profile** are opened without a session. Chat, Explore, and Settings remain usable while logged out.

**Job of the page:** make the user feel they can say something *on this page, right now*, without giving up their identity.

| Principle | Spec |
|---|---|
| Lead with desire | Speak freely on the web you’re already on |
| One CTA | **“Sign up anonymously”** — never “Sign in with Passkeys” / “Create account” / “Continue with Google” |
| Mechanism stays quiet | Passkey runs after CTA (+ handle); microcopy says “no email, no password” — not “passkeys” in the button |
| Time-to-dopamine | Brand/value → CTA in the first viewport; handle claim immediately after if needed |

**Shipped copy (EN):**

- **Headline:** “Every URL deserves a conversation”
- **Lede:** “Anonymous public comments on this page. No email. No trackers. No ads. Free forever.”
- **Primary CTA:** **Sign up anonymously** — `tryLogin()` first; on fail/cancel → claim step
- **Claim step:** “Claim your @handle”; live Available / Taken / Invalid; Continue → WebAuthn register
- **Disclaimer:** “Your device will confirm. No email. No password. If you lose all devices, this account can’t be recovered.”

Trending discovery lives on the **Explore** tab and on **everch.at**, not on the auth landing.

### Rules

| Rule | Detail |
|---|---|
| Handle format | `[a-z0-9_]`, length **3–20**, case-insensitive unique |
| Display | Always `@handle` |
| Reserved names | Block: `everchat`, `admin`, `mod`, `moderator`, `support`, `system`, `null`, `undefined`, `me`, `root`, `official`, `help`, `api`, `staff`, etc. |
| Reservation | Handle held only for the short passkey ceremony window (**5 minutes**); released if registration incomplete |
| Auth | **Passkey only** under the hood — Everchat never asks for or stores email |
| CTA language | **“Sign up anonymously”** for primary; avoid “passkey” in button labels |
| Recovery | User may register **additional passkeys** from Profile → Devices. No email recovery. |
| Session | Custom JWT (`role: authenticated`, `sub` = profile id), ~**7-day** expiry; stored in `chrome.storage.local` |

### Why passkeys (internal / privacy — not landing copy)

People will comment on news and **government** pages. Email and Google login create a durable map from real-world identity → `@handle`. Passkeys give Everchat only a public key + handle. Synced platform passkeys may still live in the user’s Google/Apple account *on their device*; Everchat never receives that email. Product UI sells **anonymity**; engineering uses WebAuthn (RP ID `everch.at`, related origins for extension IDs via `/.well-known/webauthn`).

---

## 5. URL identity (what is “this page”)

A **page** (room) in Everchat is identified by a canonical string. All users whose active tab resolves to the same canonical string share one thread.

### Canonicalization algorithm

1. Parse the active tab URL.
2. Lowercase the host; strip leading `www.`.
3. Drop protocol (`http` and `https` are the same page).
4. Drop `#fragment` for **page identity**. If the fragment matches `#ec-msg-{uuid}`, the extension still uses it to open/focus that message; it does not affect which thread loads.
5. Normalize path: remove trailing slash except for `/`.
6. Filter query params:
   - **Strip** tracking / analytics / share noise (denylist below).
   - **Keep** remaining params (meaningful identity: `v`, `id`, `q`, etc.).
7. Sort remaining query keys alphabetically; rebuild the query string.
8. Canonical form: `{host}{path}` or `{host}{path}?{sortedQuery}`.

### Tracking / noise denylist (strip)

`utm_*`, `fbclid`, `gclid`, `gclsrc`, `dclid`, `msclkid`, `twclid`, `_ga`, `_gl`, `igshid`, `mc_cid`, `mc_eid`, `ref`, `ref_src`, `wickedid`, `_hsenc`, `_hsmi`, `mkt_tok`, `si`, `feature`, `list`, and similar.

### Side panel binding

- Panel binds to the **active tab’s** canonical URL by default.
- On tab navigate / SPA history change, recompute canonical key and resubscribe to that page’s channel.
- **Room history:** Chat tab keeps an in-panel back/forward stack of prior canonical rooms visited *within this panel session* on the same browser tab (does not navigate the host tab).
- Display in chrome: page title (from tab / `pages.title`) + host; favicon when available.

**Lurkers:** can read an existing room. Creating/updating the `pages` row (first post / metadata upsert) requires an authenticated session.

---

## 6. Threading model

Everchat is **async nested comments**, not a live chat room. New messages appear live via realtime inserts. Typing presence is ephemeral (Supabase Presence).

### Behavior

| Behavior | Spec |
|---|---|
| Top-level post | “A tweet on this URL” — `parent_id = null` |
| Reply | Nested child of any message; **unbounded depth** |
| Mention prefix | Composer auto-inserts `@parentHandle ` before the user’s text; stored as part of `body` |
| Hard delete | Author can delete; content purged. If replies remain, a content-empty tombstone renders italic **Deleted comment.** |
| Sort | **Best** (score desc, then recency) — default; toggle **New** (`created_at` desc) |
| Deep trees | Collapse after **3** visible levels with “Continue thread” |
| Empty state | “Be the first to comment on this page.” |
| Live updates | Subscribe to `messages` changes for `page_id` while panel is open |
| Typing | Presence channel `page:{pageId}:typing`; signed-in users publish; idle clear ~2.5s; lurkers can observe |
| Message DOM id | Every message row has stable element id `ec-msg-{message.id}` for scroll-into-view |

### Composer constraints

- Max body length: **300** characters (UTF-8). Remaining count turns red at **250+**.
- Text and/or GIF required (at least one).
- Optional single GIF URL (`gif_url`) via Giphy search (Edge proxy; key never in extension).
- Emoji picker inserts into text (not message reactions).
- ⌘/Ctrl+Enter to submit.
- Rate-limited server-side: **10** posts / min, **60** votes / min per user.

---

## 7. Voting and karma

### Votes

- Each message has ↑ / ↓.
- One vote per authenticated user per message (`±1`); toggling or clearing allowed.
- **Message score** = upvotes − downvotes (**including** self-votes). A new post may show `+1` if the author upvotes themselves.

### Profile karma

- **Karma** = sum of votes on the user’s messages where voter ≠ author.
- Self-votes **do not** affect karma.
- Karma may go **below zero**.
- Cached integer on `profiles.karma`; maintained by DB triggers.

### Display

| Value | Color |
|---|---|
| karma / score `> 0` | Green |
| karma / score `< 0` | Red |
| `0` | Muted / neutral |

### Community moderation (no staff mods)

| Rule | Spec |
|---|---|
| Trigger | Collapsed when `downvotes / (upvotes + downvotes) ≥ 0.67` **and** total votes ≥ **3** |
| Effect | Body (and GIF) hidden behind a collapsed stub — e.g. “Community collapsed · show” |
| Always recoverable | User can expand / show; never permanently deleted by score alone |
| Reversibility | If votes shift under threshold, auto-uncollapse on next load / realtime update |

**Product beat:** free speech with crowd signal — junk gets folded away, not erased.

---

## 8. Profiles

### Own profile (Profile tab)

| Area | Spec |
|---|---|
| Header | Avatar (editable), `@handle`, colored karma |
| Avatar upload | JPEG/PNG/WebP; max ~2 MB → Supabase Storage `avatars` |
| Contact | **No email** — not collected anywhere |
| Devices | List passkeys; **Add passkey**; revoke (must keep ≥1) |
| Activity | Chronological list of **your** posts and replies across pages (with page context) |
| Sign out | Clears local session |
| Logged out | Auth landing |

### Other users (handle tap)

Tapping `@handle` in a thread opens a **read-only ProfileSheet**: avatar, handle, karma. No contact info. No their full activity feed.

---

## 9. Composer extras and translation

| Feature | Spec |
|---|---|
| Text | Required unless GIF-only — at least one of body or GIF |
| Emoji picker | Client-side (`emoji-picker-react`); Lucide trigger |
| Giphy | Search + insert one GIF; **API key only on backend** (`giphy-proxy` Edge Function) |
| See translation | Per-message action → `translate` Edge Function (Google Translate); requires `TRANSLATE_API_KEY`. UI chrome is localized; **message bodies are not auto-translated** when switching Language |

---

## 10. Notifications and deep links

When someone **replies to your message**, you get a notification. Clicking it opens the original page in a **new tab**, opens the Everchat side panel on **Chat**, and **scrolls to that reply**.

### What triggers a notification

| Event | Recipient | Notes |
|---|---|---|
| Reply to your message | Parent message author | Skip if author === replier |

No notify on votes or on top-level posts on pages you visited.

### Surfaces

1. **Chrome extension notification** (OS) from the background service worker when allowed
2. **Notifications tab** with unread badge — primary inbox inside the panel

OS toast is skipped when the side panel is visible **and** the user is already on the Notifications tab. Click → same deep-link flow as the inbox.

### Deep link format

```
https://{original-page-url}#ec-msg-{messageId}
```

Canonical page key ignores the hash. Flow: open tab → Chat → expand ancestors if needed → `scrollIntoView` → brief highlight pulse → mark notification read.

---

## 11. Page metadata (context for lists)

Notifications, Profile activity, and Explore rows join **page chrome** from `pages`:

| Field | Capture |
|---|---|
| `canonical_url` | From URL canon algorithm |
| `title` | `document.title` / tab title when panel opens or on first post |
| `description` | `meta[name=description]` or `og:description`, truncated (~120 chars); nullable |
| `favicon_url` | Tab `favIconUrl`, else host favicon |
| `updated_at` | Refresh opportunistically when an authed user opens Chat on that page |

Fallbacks: title → host; description → path; favicon → Globe icon. Client/extension captures metadata — no full HTML scrape server-side.

---

## 12. UX / Chrome extension shell

### Surface

- **Chrome Manifest V3 Side Panel API** — right-hand panel.
- **Not** a content-script overlay. Zero CSS leakage onto host pages.
- Toolbar icon toggles the side panel.

### Top navigation

Five icon tabs at the top (Everchat logo left → switches to Chat). Lucide icons + **tooltip on hover**.

| Tab | Icon | Auth gate | Content |
|---|---|---|---|
| **Chat** | MessageCircle | No | Current page thread + composer |
| **Explore** | Compass | No | Trending / New room discovery |
| **Notifications** | Bell | Yes → AuthLanding | Reply inbox; unread badge (`99+` overflow) |
| **Profile** | User | Yes → AuthLanding | Avatar, karma, devices, activity |
| **Settings** | Settings | No | Mode + Language |

### Chat tab chrome

1. **Page context header:** favicon + title + host
2. **Room history:** back / forward within panel room stack
3. **Sort by:** Best | New (dropdown)
4. Thread list; each row `id="ec-msg-{uuid}"`
5. Typing indicators above composer when present
6. Composer pinned at bottom (or **Sign up anonymously** CTA if logged out)

### Explore tab

- **Show** dropdown: **Trending** (default) | **New**
- Trending: `trending_pages` (~messages in last 24h), limit ~10
- New: recently active pages
- Row: favicon, title, host, activity (“N talking” or relative time)
- Click → open page URL in new tab + open side panel
- Empty states when nothing to show

### Settings tab

| Control | Options |
|---|---|
| **Mode** | System · Light · Dark |
| **Language** | System (= browser / Chrome UI language) + ~**50** locales |

Preferences persist (`localStorage` + `browser.storage.local`). Theme uses **zinc**-aligned neutrals (`data-theme` on `html`). RTL locales set `dir="rtl"` (e.g. ar, he, fa, ur).

### Design system

| Token | Choice |
|---|---|
| Font | **Inter** |
| Icons | **Lucide** |
| UI kit | **shadcn/ui + Tailwind** (+ **Sonner** toasts) |
| Theme | Zinc neutrals; System / Light / Dark |
| Toasts | **Sonner**, `position="bottom-center"`, offset 12, close button — success/error for auth, post, vote, upload, network |
| i18n | Catalogs in `lib/i18n/locales/` (~50); www mirrors under `www/locales/` |

### Logged-out

- Chat / Explore / Settings usable
- Thread readable; compose & vote → auth landing
- Notifications / Profile → auth landing (same tab selected)

---

## 13. Marketing site (everch.at)

Static site under `www/` (Vercel). Not a comment client.

| Surface | Behavior |
|---|---|
| Nav | Logo → home; language select |
| Hero | “Every URL deserves a conversation”; Chrome Web Store badge (**currently** `#get-extension` stub) + Support (Buy Me a Coffee) |
| `#trending` | Anon REST → `trending_pages` (limit 8); empty: “Nothing trending yet.” |
| `#how` | Four benefit beats (any page, no mods, privacy, free forever) |
| `#get-extension` | “Install from a local build” — `pnpm install && pnpm build`, load unpacked `dist/everchat` |
| Footer | Support · Privacy · Terms |
| `/privacy`, `/terms` | Legal pages (English is official legal text); contact `legal@everch.at` |
| `/.well-known/webauthn` | Related Origins for Chrome extension IDs |

---

## 14. Auth and privacy

| Topic | Spec |
|---|---|
| Method | **WebAuthn passkeys** via custom Edge Functions (`webauthn-register`, `webauthn-login`, `webauthn-add-device`) |
| Identity | `@handle` only publicly; auth uid internally |
| Email | **Not collected** |
| Social login | **Not offered** |
| Session | Custom HS256 JWT in extension storage; refresh via re-assert / re-login |
| Backend | Supabase Postgres + RLS + Realtime + Storage |

### Privacy posture

| Do | Don’t |
|---|---|
| Store handle + WebAuthn public keys | Store email, phone, OAuth subject |
| Minimize IP retention for abuse | Build identity graphs via Google |
| Prefer passkeys over inbox-based auth | Magic link, OTP, password |

### RLS (summary)

| Resource | Read | Write |
|---|---|---|
| `messages` | Anyone (incl. anon) | Authenticated insert; author hard-delete RPC |
| `profiles` (public cols) | Anyone | Owner update (avatar, etc.) |
| `votes` | Authenticated (own + aggregates via score) | Authenticated upsert/delete own vote |
| `pages` | Anyone | Authenticated upsert |
| `notifications` | Recipient only | Insert via trigger/service; recipient marks read |
| `webauthn_credentials` | Never to other users | Owner list/revoke; service insert on register |
| Challenges / username reservations | Client denied | Service role only |

---

## 15. Trust and safety

**Philosophy:** No staff viewpoint-moderation queue. Speech stays up; the community **collapses** low-consensus posts via downvotes. Collapsed ≠ deleted — always expandable. Reports are stored and reviewed periodically for illegal abuse / ToS / legal-floor patterns only — not ideology policing.

- Rate limits: **10** posts / min, **60** votes / min (server-side)
- Community collapse at majority-downvote threshold
- Report flag on messages (`reports` table) — no admin UI in product
- Reserved handles blocklist
- Hard delete for own messages
- Giphy content filtered via Giphy rating param when proxy is configured

Out of scope: bans, shadowban UI, keyword automod, staff opinion takedowns.

---

## 16. Technical architecture

### Stack

| Layer | Choice |
|---|---|
| Extension | **WXT + React + TypeScript**, MV3 Side Panel |
| UI | shadcn/ui + Tailwind, Inter, Lucide, Sonner, zinc theme |
| Backend | **Supabase** (Postgres + Realtime + Storage) |
| Auth | Custom **WebAuthn** Edge Functions + JWT |
| Proxies | `giphy-proxy`, `translate` Edge Functions |

### High-level flow

```
Chrome tab URL
    → panel: canonicalize
    → lookup or upsert pages row (upsert requires auth)
    → fetch messages tree for page_id
    → Realtime: messages (page_id) + typing presence
    → UI: Reddit-style tree + composer
```

### Core tables (conceptual)

`profiles`, `webauthn_credentials`, `username_reservations`, `pages`, `messages`, `votes`, `reports`, `notifications`, `rate_limits` — plus view `trending_pages`.

### Edge Functions

| Function | Role |
|---|---|
| `webauthn-register` | Username check/reserve → options → verify → profile + credential + JWT |
| `webauthn-login` | Discoverable assert → JWT |
| `webauthn-add-device` | Authenticated add credential |
| `giphy-proxy` | Hide Giphy API key |
| `translate` | Hide Translate API key |

---

## 17. Information architecture

```
Side Panel
├── TopNav (logo → Chat; tabs: Chat | Explore | Notifications | Profile | Settings)
├── Chat tab
│   ├── PageContextHeader
│   ├── Room history back/forward
│   ├── Sort by: Best | New
│   ├── Thread (MessageRow id=ec-msg-{uuid})
│   ├── Typing indicators
│   └── Composer (or CTA → AuthLanding)
├── Explore tab
│   ├── Show: Trending | New
│   └── Page rows → open URL + panel
├── Notifications tab (auth-gated)
│   └── NotificationRow → deep link Chat
├── Profile tab (auth-gated)
│   ├── Avatar, @handle, karma, Sign out
│   ├── Devices (add / revoke passkeys)
│   └── Activity → deep link Chat
├── Settings tab
│   ├── Mode: System | Light | Dark
│   └── Language: System + ~50 locales
├── ProfileSheet (other user, read-only)
└── AuthLanding
    ├── Headline + lede
    ├── CTA: “Sign up anonymously”
    └── Claim @handle → WebAuthn

www (everch.at)
├── Hero + CWS badge (stub) + Support
├── Trending chats
├── How it works
├── Install (local build)
├── Privacy / Terms
└── /.well-known/webauthn
```

---

## 18. UX states checklist

| State | Behavior |
|---|---|
| Panel closed | No host injection |
| Empty thread | Empty copy + composer/CTA |
| Logged out | Read OK on Chat; write/vote → auth landing |
| Auth landing | Value-led; one CTA; then claim handle |
| Typing | Presence line when others are composing |
| Room history | Back/forward enabled when stack non-empty |
| Community collapsed | Stub + show; never auto-deleted |
| Deleted node | **Deleted comment.** tombstone |
| Tab navigates | Remount thread for new canonical URL |
| Notification | Badge + optional OS toast; click → deep link |
| Explore empty | Mode-specific empty copy |
| Theme / language | Apply from Settings; Sonner theme follows resolved mode |
| Missing page meta | Fallbacks: host / path / Globe |

---

## 19. Success metrics

| Metric | Intent |
|---|---|
| Install → panel open (7d) | Activation |
| Panel open → claim started | Conversion interest |
| Claim → passkey registered | Funnel completion |
| Users with ≥1 post | Retention quality |
| Users with ≥2 passkeys | Recovery hygiene |
| Posts per active page (p50 / p90) | Thread health |
| Explore → open room | Discovery quality |
| Notification click → scrolled to message | Deep-link reliability |

---

## 20. Future / out of scope

Candidates — **not** shipped as live product surface:

- Official Chrome Web Store listing (www badge currently stubs to local install)
- Firefox / Safari
- SEO’d public comment pages per URL
- Username change; other users’ activity feeds
- Notify on @mentions beyond direct parent reply
- Optional offline recovery codes (still no email)
- Controversial sort / tunable collapse thresholds
- Global mute for OS notifications
- Site-specific URL allowlists (richer YouTube/HN rules)
- Staff admin / report review UI

---

## 21. Open questions

1. Should `@handle` be immutable after register, or changeable with cooldown?
2. Trademark policy: see TRADEMARK.md (name, logos, everch.at reserved).
3. After deep-link open, clear `#ec-msg-…` from the address bar so host SPAs are undisturbed?
4. Prompt users to add a second passkey after first successful post?
5. Should Best sort evolve to a Reddit-like confidence/hot score?
6. When CWS listing ships, retire or demote local-install copy on www?

---

## 22. Appendix — tracking param denylist (starter)

```
utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id,
utm_reader, utm_name, utm_social, utm_social-type,
fbclid, gclid, gclsrc, dclid, msclkid, twclid, igshid,
_ga, _gl, mc_cid, mc_eid, ref, ref_src, wickedid,
_hsenc, _hsmi, mkt_tok, si, feature, list
```

Plus any key matching `/^utm_/i`.

---

## 23. Document history

| Date | Change |
|---|---|
| 2026-09-05 | Initial PRD through v1.9 (build-oriented draft) |
| 2026-09-06 | **v2.0:** Rewrite to match shipped product — five-tab IA (Explore + Settings), AuthLanding without trending, room history + typing, Settings Mode/Language + zinc theme, Sonner bottom-center, www marketing site, WebAuthn Edge Functions + concrete rate limits / reservation window; move unshipped items to Future |
