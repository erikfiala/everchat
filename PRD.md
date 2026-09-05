# Everchat — Product Requirements Document

**Version:** 1.6  
**Status:** Draft for build  
**Product:** Chrome extension — public, Reddit-style comments on any URL  
**Last updated:** 2026-09-05

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
| Early adopter | Lightweight chrome side panel; no account until they want to speak |

---

## 3. Goals and non-goals

### Goals (v1)

- Side-panel discussion bound to a **canonical URL**
- Read without an account; write after **claiming a username** and registering a **passkey**
- Infinitely nested replies with auto `@mention` prefix on reply
- Upvote / downvote; message score and profile karma (self-votes excluded from karma)
- **No staff moderation** — community collapse when a message hits a majority-downvote threshold (Reddit-style; always expandable)
- Profiles: handle, optional avatar, karma (green / red); **own Profile tab** with avatar upload + list of your posts/replies
- **Top nav tabs:** Chat · Notifications · Profile (tooltips on hover)
- **Page context** on notifications and activity rows: favicon + meta title + short description
- Composer: text, emoji picker, Giphy GIF insert
- **Reply notifications** that open the page in a new tab with the side panel focused on the reply (per-message deep link / `#id`)
- Auth landing (value-led) with CTA **Sign in anonymously** and **Trending chats** (open site → join)
- Performant MV3 side panel (no host-page CSS leakage)
- Supabase backend with RLS, realtime inserts, Storage for avatars

### Non-goals (v1)

- Firefox / Safari
- Standalone public web app or SEO’d comment pages
- DMs, follows, awards, paid features
- Full moderation dashboard / admin UI / staff takedowns of speech
- Automod / keyword bans / shadowbans as default moderation (community votes only)
- Edit history / message editing after post
- **Email / password / magic link / OTP / Google (or any social) OAuth** — privacy by design
- Email / push notifications outside the extension (Chrome extension notifications + in-panel inbox only)
- Account recovery via email (recovery = add a second passkey only)

---

## 4. Conversion (the product bet)

Signup is not “create an account” and not “sign in with passkeys.” It is **join anonymously**: claim a handle, lock it with a passkey under the hood. No email step. Passkeys are the mechanism; the product language is anonymity and speech.

```
Install → browse any page → read thread (no account)
        → first write action OR open Notifications/Profile while logged out
        → Auth landing (value, not features)
        → Primary CTA: “Sign in anonymously”
        → Claim @handle (min 3 chars, unique, live check)
        → Passkey ceremony (WebAuthn — invisible as “passkey” in primary copy)
        → Write unlocked
```

### Auth landing page (logged-out gate)

When write/vote is gated — or when Notifications / Profile need an account — show a **landing**, not a login form. Optimize for **time-to-dopamine**: one clear desire, one CTA, minimal friction. Do **not** lead with feature lists, WebAuthn jargon, or “how it works” diagrams.

**Job of the page:** make the user feel they can say something *on this page, right now*, without giving up their identity.

| Principle | Spec |
|---|---|
| Lead with desire | Speak freely on the web you’re already on |
| One CTA | **“Sign in anonymously”** — never “Sign in with Passkeys” / “Create account” / “Continue with Google” |
| Mechanism stays quiet | Passkey runs after CTA (+ handle); microcopy may say “no email, no password” — not “passkeys” |
| Time-to-dopamine | Brand → one line of value → CTA in the first viewport; handle claim immediately after |
| Proof, not features | Concrete places (news, gov, any URL) > bullet feature grids |
| Social proof below fold | **Trending chats** — live rooms you can open and join (see below) |

**Directional content (not final copy):**

- **Brand:** Everchat (hero-level)
- **Headline (value):** e.g. “Say what you think — on any page.”
- **One supporting line:** Anonymous comments on this URL. News, gov sites, anything with a link. No email.
- **Social proof / vibe (optional, light):** one short line — “A thread for every page. Tracking noise stripped so the conversation sticks to the article, not the ad params.”
- **Primary CTA:** **Sign in anonymously**
- **Secondary (returning):** smaller text link — “Already joined? Unlock” (still triggers WebAuthn; no passkey branding)
- **Below the CTA (still on the landing):** **Trending chats** section

**Value beats to hit (emotion, not a feature checklist):**

1. Leave a comment **anywhere** you’re browsing — the page is the room.
2. **Free speech** posture: talk about news, policy, **government sites**, portals — without handing Everchat your inbox. **No staff mods** — the crowd collapses junk; you can always expand it.
3. Each **URL** (domain + path/slug) gets its **own** chat; tracking parameters don’t splinter the room.
4. You’re not alone — **trending** rooms are already buzzing; tap in and join.

URL mechanics (slugs in, tracking out) may appear as **one short reassurance line**, not a technical explainer.

### Trending chats (on the auth landing)

A scrollable section under the hero/CTA that lists **active / trending page threads** so a new user gets instant dopamine: open a real convo, not an empty promise.

| Spec | Detail |
|---|---|
| Placement | Auth landing, **below** brand + value + primary CTA (does not steal the first-viewport CTA) |
| Purpose | Proof that Everchat is alive; one-tap path into a hot room |
| Row content | Same **page context** chrome: favicon, meta title, short description; plus activity signal (e.g. message count / “N talking” / recent velocity) |
| Count | ~5–10 rows (virtualize if more); empty state hidden entirely if nothing trending |
| Click | Open the page URL in a **new tab** and open the side panel on **Chat** for that page (no `#ec-msg` unless deep-linking a specific message) |
| Join | Reading is open; composing still requires **Sign in anonymously** if logged out — landing can stay available via Profile/Notifications, but trending click prioritizes jumping into the chat |
| Ranking (v1) | Pages with most messages (or most messages in last 24h) among non-empty threads; exclude spam/empty |
| Privacy | Only public page metadata + aggregate counts — no user PII in the list |

Trending is **discovery**, not a feature tour — keep the section visual and light (rows, not charts).

### Rules

| Rule | Detail |
|---|---|
| Handle format | `[a-z0-9_]`, length **3–20**, case-insensitive unique |
| Display | Always `@handle` |
| Reserved names | Block: `everchat`, `admin`, `mod`, `support`, `system`, `null`, `me`, etc. |
| Reservation | Handle held only for the short passkey ceremony window (e.g. **15 minutes**); released if registration incomplete |
| Auth | **Passkey only** under the hood — Everchat never asks for or stores email |
| CTA language | **“Sign in anonymously”** for primary; avoid “passkey” in button labels |
| Recovery (v1) | User may register **additional passkeys** from Profile (second device). No email recovery. |
| Psychological lever | Landing sells anonymity + speech → handle scarcity → biometric confirm as a beat, not a form |

### Post-CTA flow copy (directional)

- After **Sign in anonymously** (new user): **“Pick your @handle”** — live Available / Taken
- After handle valid: OS WebAuthn prompt (no separate “enable passkeys” screen)
- Success toast (Sonner): e.g. “You’re in as @you”
- Error toast (Sonner): e.g. “Couldn’t finish sign-in — try again”
- Locked composer CTA: **“Sign in anonymously to join”**

### Why passkeys (internal / privacy — not landing copy)

People will comment on news and **government** pages. Email and Google login create a durable map from real-world identity → `@handle`. Passkeys give Everchat only a public key + handle. Synced platform passkeys may still live in the user’s Google/Apple account *on their device*; Everchat never receives that email. Product UI sells **anonymity**; engineering uses WebAuthn.

## 5. URL identity (what is “this page”)

A **page** in Everchat is identified by a canonical string. All users whose active tab resolves to the same canonical string share one thread.

### Canonicalization algorithm

1. Parse the active tab URL.
2. Lowercase the host; strip leading `www.`.
3. Drop protocol (`http` and `https` are the same page).
4. Drop `#fragment` for **page identity**. If the fragment matches `#ec-msg-{uuid}`, the extension still uses it to open/focus that message (see §10); it does not affect which thread loads.
5. Normalize path: remove trailing slash except for `/`.
6. Filter query params:
   - **Strip** tracking / analytics / share noise (denylist below).
   - **Keep** remaining params (meaningful identity: `v`, `id`, `q`, etc.).
   - Also strip common non-identity params: `t`, `si`, `feature`, `list` (YouTube-style) unless later allowlisted.
7. Sort remaining query keys alphabetically; rebuild the query string.
8. Canonical form: `{host}{path}` or `{host}{path}?{sortedQuery}`.

Deep-link example (same thread as without hash):

| Input | Canonical | Focus |
|---|---|---|
| `https://nytimes.com/.../foo.html#ec-msg-a1b2…` | `nytimes.com/.../foo.html` | Scroll to message `a1b2…` |

### Tracking / noise denylist (strip)

`utm_*`, `fbclid`, `gclid`, `gclsrc`, `dclid`, `msclkid`, `twclid`, `_ga`, `_gl`, `igshid`, `mc_cid`, `mc_eid`, `ref`, `ref_src`, `wickedid`, `_hsenc`, `_hsmi`, `mkt_tok`, `si`, `t` (timestamp), and similar.

### Examples

| Input | Canonical |
|---|---|
| `https://www.nytimes.com/2026/01/01/world/foo.html?utm_source=twitter#comments` | `nytimes.com/2026/01/01/world/foo.html` |
| `https://www.youtube.com/watch?v=abc&t=30s&si=xyz` | `youtube.com/watch?v=abc` |
| `https://news.ycombinator.com/item?id=123&utm_source=share` | `news.ycombinator.com/item?id=123` |

### Side panel binding

- Panel always binds to the **active tab’s** canonical URL.
- On tab navigate / SPA history change, recompute canonical key and resubscribe to that page’s channel.
- Display in chrome: page title (from tab) + canonical host.

**Rationale for “strip tracking only”:** News articles share one thread as intended; YouTube / HN / search keep distinct threads via meaningful query params.

---

## 6. Threading model

Everchat is **async nested comments**, not a live chat room. New messages appear live via realtime inserts.

### Behavior

| Behavior | Spec |
|---|---|
| Top-level post | “A tweet on this URL” — `parent_id = null` |
| Reply | Nested child of any message; **unbounded depth** |
| Mention prefix | Composer auto-inserts `@parentHandle ` before the user’s text; stored as part of `body` |
| Soft delete | Author can delete; body renders as `[deleted]`; children remain |
| Sort (v1) | **Best** (score desc, then recency); toggle **New** (created_at desc) |
| Deep trees | Collapse after ~3 visible levels with “Continue thread”; virtualize long lists |
| Empty state | “Be the first to comment on this page.” |
| Live updates | Subscribe to inserts/updates for `page_id` while panel is open |
| Message DOM id | Every message row has a stable element id `ec-msg-{message.id}` for scroll-into-view |

### Composer constraints

- Max body length: **2,000** characters (UTF-8).
- Optional single GIF URL (`gif_url`).
- Emoji picker (client-side).
- Rate-limited (see Trust & safety).

---

## 7. Voting and karma

### Votes

- Each message has ↑ / ↓.
- One vote per authenticated user per message (`±1`); toggling or clearing allowed.
- **Message score** = sum of all votes (**including** self-votes). A new post may show `+1` if the author upvotes themselves.

### Profile karma

- **Karma** = sum of votes on the user’s messages where `voter_id !== author_id`.
- Self-votes **do not** affect karma.
- Karma may go **below zero**.
- Stored as a cached integer on `profiles.karma`; maintained by DB triggers (client never recomputes).

### Display

| Value | Color |
|---|---|
| karma / score `> 0` | Green |
| karma / score `< 0` | Red |
| `0` | Muted / neutral |

Same color language for profile karma and compact message score chips.

### Community moderation (no staff mods)

Everchat does **not** employ content moderators and does **not** remove speech by default. The only “moderation” is **community collapse**, Reddit-style:

| Rule | Spec |
|---|---|
| Trigger | A message is **community-collapsed** when downvotes reach a **majority threshold** among people who voted on that message |
| Threshold (v1) | Collapsed when `downvotes / (upvotes + downvotes) ≥ 0.67` **and** total votes ≥ **3** (avoid collapse on a single drive-by dislike). Exact numbers are tunable; document as product constants. |
| Effect | Body (and GIF) **hidden** behind a collapsed stub — e.g. “Community collapsed · score −N · show” |
| Always recoverable | User can **expand / show** on click; collapse again with hide. Never permanently deleted by the system for score alone. |
| Children | Nested replies remain reachable; collapsed parent shows a stub, children may still render or sit under “show” (Reddit-like: expand parent to read context) |
| Reversibility | If votes shift back under threshold, auto-uncollapse on next load / realtime update |
| Not the same as | Author soft-delete (`[deleted]`), depth collapse (“continue thread”), or staff takedown (none in v1) |

**Product beat:** free speech with crowd signal — junk gets folded away, not erased; curious readers can always open it.

Authored soft-delete and community collapse can both apply; deleted body still shows `[deleted]` regardless of score.

---

## 8. Profiles

### Own profile (Profile tab)

Primary destination for the signed-in user — third top-level tab (see §12).

| Area | Spec |
|---|---|
| Header | Avatar (editable), `@handle`, colored karma |
| Avatar upload | In-place; crop square; JPEG/PNG/WebP; max ~2 MB → Supabase Storage |
| Contact | **No email** — not collected anywhere |
| Passkeys | List authenticators; **Add passkey**; revoke (keep ≥1) |
| Activity | Chronological list of **your** posts and replies across all pages |
| Empty activity | “You haven’t joined any conversations yet.” |
| Logged out | Auth landing (value + “Sign in anonymously”) |

### Activity row (your convos / replies)

Each row is one of your messages, with enough **page context** to know where you posted:

| Element | Source |
|---|---|
| Favicon (16–20px) | `pages.favicon_url` |
| Meta title | `pages.title` (fallback: host) |
| Short description | `pages.description` truncated (~120 chars; fallback: canonical path) |
| Your message preview | `messages.body` truncated; or GIF indicator |
| Kind chip | `Post` vs `Reply` |
| Timestamp | Relative (`2h ago`) |
| Score | Colored compact score |

**Click** → same deep-link flow as notifications: open `page_url#ec-msg-{id}` in a new tab, open Chat tab, scroll to that message.

### Other users (handle tap)

Tapping `@handle` in a thread opens a **read-only profile sheet** (not the Profile tab): avatar, handle, karma. No contact info. No “their full activity” in v1 (privacy / scope) — optional v1.1.

### Avatar upload

- Formats: JPEG, PNG, WebP
- Max size: ~2 MB
- Cropped square; stored in Supabase Storage
- Public URL on profile
- Default: initials or identicon when unset

---

## 9. Composer extras

| Feature | Spec |
|---|---|
| Text | Required unless GIF-only is allowed — v1: text required OR gif required (at least one) |
| Emoji picker | Client-side picker; Lucide trigger icon |
| Giphy | Search + insert one GIF; **API key only on backend** (Edge Function proxy); never ship key in extension |

Giphy is specified for v1; may ship after core text threads in an internal build, but remains in scope for v1 launch.

---

## 10. Notifications and deep links

When someone **replies to your message**, you get a notification. Clicking it opens the original page in a **new tab**, opens the Everchat side panel on the **Chat** tab, and **scrolls to that reply**.

### What triggers a notification

| Event | Recipient | Notes |
|---|---|---|
| Reply to your message | Parent message author | Skip if author === replier (no self-notify) |
| (v1 only) | — | No notify on upvotes/downvotes or top-level posts on pages you visited |

### Notification surfaces (v1)

1. **Chrome extension notification** (system tray / OS) when the extension is allowed
2. **Notifications tab** (top nav) with unread badge — primary inbox inside the panel

### Notification list row (page context required)

Every notification row must show **where** the conversation lives, not only who replied:

| Element | Spec |
|---|---|
| Favicon | `pages.favicon_url` |
| Meta title | `pages.title` (fallback: host) |
| Short description | `pages.description` truncated (~120 chars) |
| Actor | `@replier` avatar + handle |
| Preview | Snippet of the reply body |
| Unread | Distinct style until opened |
| Timestamp | Relative |

Same visual language as Profile activity rows so context is consistent.

### Deep link format

Every message already has a stable UUID (`messages.id`). Deep links use an Everchat-owned **hash fragment** so they never create a separate thread (canonicalization already strips `#fragment`):

```
https://{original-page-url}#ec-msg-{messageId}
```

Example:

```
https://www.nytimes.com/2026/01/01/world/foo.html#ec-msg-a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Canonical page key remains `nytimes.com/2026/01/01/world/foo.html` (hash ignored).

### Click → open → scroll flow

```
Notification (or activity) click
  → chrome.tabs.create({ url: pageUrl + "#ec-msg-" + replyId })
  → open Side Panel on that tab → switch to Chat tab
  → panel reads hash (or pending focus message id from extension messaging)
  → load thread for canonical URL
  → expand ancestors if the reply is under a collapsed branch
  → scrollIntoView on #ec-msg-{id}
  → brief highlight pulse on the target row
  → mark notification read
```

### Message `#id` requirements

| Requirement | Spec |
|---|---|
| Stable id | `messages.id` (UUID); never reused |
| DOM attribute | `id="ec-msg-{uuid}"` on each `MessageRow` |
| Shareable | Copy-link-to-comment builds `{pageUrl}#ec-msg-{id}` (optional v1 affordance on message menu) |
| Host page safety | Hash is for Everchat only; extension may clear or ignore host SPA hash conflicts by preferring extension messaging when the tab was opened by Everchat |

### Data

Notifications are persisted (not ephemeral OS-only) so the inbox works across sessions. Page context is **joined from `pages`**, not duplicated on every notification (except `page_url` for open-target convenience).

```text
notifications
  id              uuid PK
  recipient_id    uuid FK → profiles
  actor_id        uuid FK → profiles      -- who replied
  message_id      uuid FK → messages      -- the reply to scroll to
  parent_id       uuid FK → messages      -- message that was replied to
  page_id         uuid FK → pages
  page_url        text                    -- full https URL to open (hash built at click)
  body_preview    text                    -- short snippet of the reply
  read_at         timestamptz null
  created_at      timestamptz
```

Created by DB trigger (or Edge Function) on `messages` insert when `parent_id` is set and parent.author_id ≠ new.author_id.

### RLS

| Resource | Read | Write |
|---|---|---|
| `notifications` | Recipient only | Insert via trigger/service; recipient marks read |

---

## 11. Page metadata (context for lists)

Notifications and Profile activity must never be “orphan” message snippets. Every list row joins **page chrome**:

| Field on `pages` | Capture |
|---|---|
| `canonical_url` | From URL canon algorithm |
| `title` | `document.title` / tab title when panel opens or on first post |
| `description` | `meta[name=description]` or `og:description`, truncated; nullable |
| `favicon_url` | Tab `favIconUrl` via `chrome.tabs`, else `/favicon.ico` on host |
| `updated_at` | Refresh title/description/favicon opportunistically when an authed user opens Chat on that page |

Fallbacks if meta is missing: title → host; description → path; favicon → generic globe icon (Lucide).

Do **not** scrape full page HTML server-side in v1 — client/extension captures metadata and upserts onto `pages`.

---

## 12. UX / Chrome extension shell

### Surface

- **Chrome Manifest V3 Side Panel API** — right-hand panel, Gemini/Claude-like.
- **Not** a content-script overlay. Zero CSS leakage onto host pages.
- Toolbar icon toggles the side panel.
- Host page performance unaffected until the panel is opened.

### Top navigation (primary chrome)

Three tabs at the **top** of the side panel (mobile-app pattern, but top-aligned). Lucide icons + **tooltip on hover** with the tab name.

| Tab | Icon (directional) | Tooltip | Content |
|---|---|---|---|
| **Chat** | MessageCircle | Chat | Current page thread + composer (default when opening panel on a page) |
| **Notifications** | Bell | Notifications | Inbox of replies to you; unread badge on icon |
| **Profile** | User | Profile | Your avatar, karma, upload, activity list |

- Active tab: clear selected state.
- Unread count badge on Notifications when `read_at is null`.
- Deep links / notification clicks land on **Chat** after opening the target page.
- Logged-out: Chat readable; Notifications and Profile show **auth landing** (value + “Sign in anonymously”)

### Chat tab chrome

1. Optional subheader: current page favicon + title + host (reinforces “you’re on this page”)
2. Sort control: Best / New
3. Thread list (virtualized); each row `id="ec-msg-{uuid}"`
4. Composer pinned at bottom (or CTA → auth landing if logged out)

### Logged-out

- Thread **fully readable** on Chat
- Composer replaced by CTA that opens the **auth landing**: **Sign in anonymously**
- Voting gated the same way as posting (opens auth landing)
- Notifications / Profile → auth landing (not a bare login form)

### Design system

| Token | Choice |
|---|---|
| Font | **Inter** |
| Icons | **Lucide** |
| UI kit | **shadcn/ui + Tailwind** (+ **Sonner** toasts) |
| Tooltips | shadcn Tooltip on top-nav icons |
| Toasts | **Sonner** (`sonner` / shadcn Sonner) for **success and error** feedback — auth, post, vote, upload, network failures. Prefer toasts over blocking alerts for non-destructive outcomes. |

### Toasts (Sonner) — when to fire

| Event | Tone |
|---|---|
| Signed in / handle claimed | Success |
| Message posted / reply sent | Success (optional, keep subtle) |
| Avatar uploaded | Success |
| Auth cancelled / WebAuthn failed | Error |
| Rate limited / network / permission errors | Error |
| Vote failed to save | Error |

### Performance requirements

- Side panel JS loads only when the panel opens
- Realtime subscribe only to the active `page_id` while on Chat
- Virtualize message lists, notification lists, and profile activity
- Lazy-load collapsed branches
- No content-script injection on every page load
- Target: panel interactive < 500ms on mid-tier hardware after first open (warm)

---

## 13. Auth and privacy

| Topic | Spec |
|---|---|
| Method | **WebAuthn passkeys** (discoverable credentials) — register + assert |
| Identity | `@handle` only publicly; auth uid internally |
| Email | **Not collected** |
| Social login | **Not offered** (esp. Google) |
| Session | Short-lived session token in `chrome.storage.session` / local; refresh via re-assert or silent session as designed |
| Backend | Supabase Postgres + RLS + Realtime + Storage; auth ceremonies via **Edge Functions** (challenge/verify) storing credential public keys — or Supabase Auth passkeys if production-ready at build time |
| Extension UX | WebAuthn runs in the side panel / extension page (same-origin ceremony) |

### Passkey lifecycle

1. **Register:** after handle claim → `navigator.credentials.create` → store `credential_id`, public key, sign counter, user_id, friendly device label.
2. **Login (returning):** “Already joined? Unlock” → `navigator.credentials.get` → verify → session. No “passkey” in the button.
3. **Add passkey:** from Profile (logged in) for a second device / backup.
4. **Revoke passkey:** from Profile; must keep ≥1 passkey while account is active.
5. **Lost all passkeys:** account not recoverable in v1 (document clearly at signup). v1.1 may explore optional paper recovery codes (still no email).

### Privacy posture

| Do | Don’t |
|---|---|
| Store handle + WebAuthn public keys | Store email, phone, OAuth subject |
| Minimize IP retention (short window / hash if needed for abuse) | Build identity graphs via Google |
| Prefer passkeys over any inbox-based auth | Magic link, OTP, password |

### RLS (summary)

| Resource | Read | Write |
|---|---|---|
| `messages` | Anyone (including anon) | Authenticated insert; author soft-delete |
| `profiles` (public cols) | Anyone | Owner update (avatar, etc.) |
| `votes` | Authenticated (own + aggregates via score) | Authenticated upsert/delete own vote |
| `pages` | Anyone | Upsert on first comment (authenticated) or service role |
| `notifications` | Recipient only | Insert via trigger/service; recipient updates `read_at` |
| `webauthn_credentials` | Never to other users | Owner list/revoke; service insert on register |
| Auth secrets | Server-only | Challenge verify on Edge Function |

---

## 14. Trust and safety (v1 light)

**Philosophy:** No staff moderation queue. Speech stays up; the community **collapses** low-consensus posts via downvotes (see §7). Collapsed ≠ deleted — always expandable.

- Rate limits: posts and votes per user per minute (server-side) — anti-spam, not content policing
- Community collapse at majority-downvote threshold (Reddit-style show/hide)
- Report flag on messages (`reports` table) — **store only** for future abuse patterns; **no admin takedown UI in v1**
- Reserved handles blocklist
- Soft delete for own messages
- Giphy content filtered via Giphy’s content rating param (e.g. `pg-13` or stricter)

Out of scope v1: bans, shadowban UI, keyword automod, staff removals, spam classifiers beyond rate limits.

---

## 15. Technical architecture

### Stack

| Layer | Choice | Why |
|---|---|---|
| Extension | **WXT + React + TypeScript**, MV3 Side Panel | Vite-based, shadcn-friendly, no page inject |
| UI | shadcn/ui + Tailwind, Inter, Lucide, **Sonner** | Product requirement |
| Backend / DB | **Supabase** (Postgres + Realtime + Storage) + **WebAuthn** Edge Functions | Nested comments, votes, karma; passkeys without email; avatars; RLS; realtime |
| GIF proxy | Supabase Edge Function → Giphy | Hides API key |

**Why not Firebase:** nested trees + vote/karma aggregates are awkward.  
**Why not custom Node + Postgres:** would rebuild auth, realtime, and storage.

### High-level flow

```
Chrome tab URL
    → background / panel: canonicalize
    → lookup or create pages row
    → fetch messages tree for page_id
    → Realtime channel: messages (page_id)
    → UI: Reddit-style tree + composer
```

### Data model

```text
profiles
  id            uuid PK
  username      text unique (citext / lower unique)
  avatar_url    text null
  karma         integer not null default 0
  created_at    timestamptz

webauthn_credentials
  id              uuid PK
  user_id         uuid FK → profiles
  credential_id   bytea unique
  public_key      bytea
  sign_count      bigint
  transports      text[] null
  device_label    text null
  created_at      timestamptz
  last_used_at    timestamptz null

username_reservations   -- short-lived during passkey ceremony
  username        text
  reserved_until  timestamptz
  session_token   text

pages
  id              uuid PK
  canonical_url   text unique
  title           text null           -- meta / document title
  description     text null           -- meta description / og:description (short)
  favicon_url     text null
  created_at      timestamptz
  updated_at      timestamptz

messages
  id            uuid PK
  page_id       uuid FK → pages
  author_id     uuid FK → profiles
  parent_id     uuid null FK → messages
  body          text
  gif_url       text null
  score         integer not null default 0
  upvotes       integer not null default 0   -- denormalized for collapse threshold
  downvotes     integer not null default 0
  deleted_at    timestamptz null
  created_at    timestamptz

votes
  message_id    uuid FK → messages
  user_id       uuid FK → profiles
  value         smallint  -- -1 | 1
  primary key (message_id, user_id)

reports
  id            uuid PK
  message_id    uuid FK → messages
  reporter_id   uuid FK → profiles
  reason        text null
  created_at    timestamptz

notifications
  id              uuid PK
  recipient_id    uuid FK → profiles
  actor_id        uuid FK → profiles
  message_id      uuid FK → messages   -- reply to open/scroll to
  parent_id       uuid FK → messages   -- message that was replied to
  page_id         uuid FK → pages
  page_url        text                 -- https URL of the page (hash added at click time)
  body_preview    text
  read_at         timestamptz null
  created_at      timestamptz
```

### Indexes

- `messages (page_id, parent_id, created_at)`
- `messages (page_id, score desc, created_at desc)` for Best sort
- unique `votes (message_id, user_id)`
- unique lower(`profiles.username`)
- unique `pages.canonical_url`
- unique `webauthn_credentials (credential_id)`
- `webauthn_credentials (user_id)`
- `notifications (recipient_id, created_at desc)`
- `notifications (recipient_id) where read_at is null` (unread)

### Triggers

1. On `votes` insert / update / delete → recompute `messages.score`, `upvotes`, `downvotes` for that message.
2. Same event → if `voter_id !== author_id`, adjust `profiles.karma` by the delta of the vote change.
3. Soft delete does not wipe votes; score may remain for sorting of tombstones or be frozen — **v1: keep score on tombstone, hide vote controls**.
4. On `messages` insert with non-null `parent_id` → create `notifications` row for parent author (if ≠ replier), including `page_url` and `body_preview`.
5. Profile activity is a query: `messages where author_id = me` joined to `pages` — no separate table in v1.
6. Community collapse is **derived client-side (or view)** from `upvotes`/`downvotes` vs threshold constants — no separate “moderator” action. Optional cached `is_collapsed` boolean updated by trigger for query convenience.

---

## 16. Information architecture (extension)

```
Side Panel
├── TopNav (Chat | Notifications | Profile) — Lucide icons + hover tooltips
├── Chat tab
│   ├── PageContextHeader (favicon, title, host)
│   ├── Sort: Best | New
│   ├── Thread
│   │   ├── MessageRow id=ec-msg-{uuid}
│   │   └── Nested children…
│   └── Composer (or CTA → AuthLanding)
├── Notifications tab
│   ├── Unread badge on nav icon
│   └── NotificationRow (favicon, title, description, @actor, preview)
│       └── click → new tab #ec-msg-{id} → Chat
├── Profile tab (own)
│   ├── Avatar upload / preview
│   ├── @handle + karma
│   ├── Passkeys (add / revoke) — engineering label; UI: “Devices” / “Unlock methods”
│   └── ActivityRow (favicon, title, description, your post/reply preview)
│       └── click → new tab #ec-msg-{id} → Chat
├── ProfileSheet (other user, from handle tap — read-only)
└── AuthLanding (value-led)
    ├── Brand + headline + one supporting line
    ├── CTA: “Sign in anonymously”
    ├── Returning: “Already joined? Unlock”
    ├── TrendingChats (favicon, title, description, activity → open page + Chat)
    └── Handle claim → WebAuthn (quiet)
```

---

## 17. UX states checklist

| State | Behavior |
|---|---|
| Panel closed | No work; no injection |
| Panel open, loading | Skeleton thread |
| Empty thread | Empty copy + composer/CTA |
| Logged out | Read OK; write/vote → auth landing → Sign in anonymously |
| Auth landing | Value-led; CTA “Sign in anonymously”; **Trending chats** below; no passkey button label |
| Passkey ceremony pending | OS prompt after handle; handle reserved briefly |
| Auth success / error | Sonner toast |
| Authenticated | Full compose / vote |
| All passkeys lost | Account unrecoverable in v1 (clear warning at signup) |
| Deep nest | Collapse + continue |
| Community collapsed | Stub “Community collapsed · show”; expand reveals body; never auto-deleted |
| Deleted node | `[deleted]`, children intact |
| Network / auth error | Inline error, retry |
| Tab navigates | Remount thread for new canonical URL |
| Notification arrives | Badge on Notifications tab; optional Chrome OS notification |
| Notification click / deep link | New tab → Chat tab → expand path → scroll to `#ec-msg-{id}` → highlight |
| Unread inbox | Notifications tab list with page context; mark read on open |
| Profile activity | Own posts/replies with page context; click → same deep link |
| Missing page meta | Fallbacks: host / path / Lucide globe |

---

## 18. Success metrics (v1)

| Metric | Intent |
|---|---|
| Install → panel open (7d) | Activation |
| Panel open → claim started | Conversion interest |
| Claim → passkey registered | Funnel completion |
| Users with ≥1 post | Retention quality |
| Users with ≥2 passkeys | Recovery hygiene |
| Posts per active page (p50 / p90) | Thread health |
| % votes that are self-votes | Sanity / gaming signal |
| p95 panel open → first paint | Performance |
| Notification click → scrolled to message (success rate) | Deep-link reliability |
| % reply events that produce a notification | Funnel integrity |

---

## 19. Release cut

### v1 (launch)

- Side panel + URL canon (tracking strip)
- Top nav: **Chat · Notifications · Profile** (tooltips on hover)
- Auth landing (value-led) + CTA **Sign in anonymously** → handle + passkey under the hood (no email)
- **Trending chats** on auth landing (open site → join convo)
- Sonner toasts for success/error
- Nested threads + mention prefix
- Per-message `#ec-msg-{id}` deep links + scroll-to
- Reply notifications (Chrome + Notifications tab) with **page context** (favicon, title, description)
- Profile tab: avatar upload, **passkey management**, activity list with page context
- Page metadata capture on `pages` (client upsert)
- Votes + karma rules
- **No staff mods** — community collapse at majority-downvote threshold (always expandable)
- Emoji + Giphy (proxy)
- Report store-only (no takedown queue)
- Rate limits + RLS

### v1.1 (candidates)

- Site-specific URL allowlists (richer YouTube/HN rules)
- Username change (rate-limited)
- Message edit window (e.g. 5 minutes)
- Notify on @mentions beyond direct parent reply
- Other users’ public activity feeds
- Optional offline recovery codes (still no email)
- Tunable per-page collapse thresholds / “controversial” sort
- Firefox

---

## 20. Open questions

1. Should `@handle` be immutable after passkey register, or changeable with cooldown?
2. GIF-only messages without text — allow or require text?
3. Exact reserved-username list and trademark handling?
4. WebAuthn RP ID / origin strategy for Chrome extension (extension ID vs associated https domain)?
5. Should Best sort use a Reddit-like confidence/hot score later, or raw score forever?
6. Collapse depth: fixed 3 vs user preference?
7. After deep-link open, clear `#ec-msg-…` from the address bar so host SPAs are undisturbed?
8. Mute / disable OS notifications while keeping the Notifications tab?
9. Refresh `pages` metadata on every Chat open, or only when empty / stale (e.g. >7 days)?
10. Profile activity: include soft-deleted own messages as tombstones, or hide them?
11. Prompt users to add a second passkey after first successful post?
12. How aggressively to minimize / hash IP logs for abuse prevention vs privacy?
13. Exact collapse threshold: stick with 67% + min 3 votes, or Reddit-like “score below X and downvote ratio”?
15. Trending window: last 24h vs all-time message count for v1 ranking?

---

## 21. Appendix — tracking param denylist (starter)

```
utm_source, utm_medium, utm_campaign, utm_term, utm_content, utm_id,
utm_reader, utm_name, utm_social, utm_social-type,
fbclid, gclid, gclsrc, dclid, msclkid, twclid, igshid,
_ga, _gl, mc_cid, mc_eid, ref, ref_src, wickedid,
_hsenc, _hsmi, mkt_tok, si, feature
```

Plus any key matching `/^utm_/i`. Timestamp-like `t` stripped on known video hosts in v1.

---

## 22. Document history

| Date | Change |
|---|---|
| 2026-09-05 | Initial PRD from product briefing |
| 2026-09-05 | v1.1: reply notifications, `#ec-msg-{id}` deep links, scroll-to-reply |
| 2026-09-05 | v1.2: top tabs (Chat/Notifications/Profile), profile activity, page context (favicon/title/description) |
| 2026-09-05 | v1.3: passkey-only auth (no email / magic link / social); WebAuthn credentials model |
| 2026-09-05 | v1.4: auth landing (time-to-dopamine); CTA “Sign in anonymously”; Sonner toasts |
| 2026-09-05 | v1.5: no staff moderation; community collapse via majority downvotes (Reddit-style, always expandable) |
| 2026-09-05 | v1.6: trending chats section on auth landing (open site → join convo) |
