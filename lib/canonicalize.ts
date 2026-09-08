import { EC_MSG_PREFIX, TRACKING_PARAM_DENYLIST, WWW_ORIGIN } from './constants';

export interface CanonicalResult {
  canonicalUrl: string;
  focusMessageId: string | null;
  host: string;
  path: string;
}

const VIDEO_HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'youtu.be',
  'vimeo.com',
]);

function shouldStripParam(key: string, host: string): boolean {
  const lower = key.toLowerCase();
  if (TRACKING_PARAM_DENYLIST.has(lower)) return true;
  if (/^utm_/i.test(lower)) return true;
  // Timestamp-like `t` on video hosts
  if (lower === 't' && VIDEO_HOSTS.has(host.toLowerCase())) return true;
  return false;
}

/**
 * Parse `#ec-msg-{uuid}` from a URL fragment without affecting page identity.
 */
export function parseFocusMessageId(hash: string | null | undefined): string | null {
  if (!hash) return null;
  const cleaned = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!cleaned.startsWith(EC_MSG_PREFIX)) return null;
  const id = cleaned.slice(EC_MSG_PREFIX.length);
  // UUID v4-ish or any non-empty id
  if (!id || id.length < 8) return null;
  return id;
}

/**
 * Canonicalize a page URL for Everchat thread identity.
 * Strips tracking params, www, protocol, and hash (except parsing #ec-msg- for focus).
 */
export function canonicalize(rawUrl: string): CanonicalResult {
  let focusMessageId: string | null = null;

  try {
    const url = new URL(rawUrl);
    focusMessageId = parseFocusMessageId(url.hash);

    let host = url.hostname.toLowerCase();
    if (host.startsWith('www.')) {
      host = host.slice(4);
    }

    let path = url.pathname || '/';
    if (path.length > 1 && path.endsWith('/')) {
      path = path.slice(0, -1);
    }

    const kept = new URLSearchParams();
    const entries: [string, string][] = [];
    url.searchParams.forEach((value, key) => {
      if (!shouldStripParam(key, host)) {
        entries.push([key, value]);
      }
    });
    entries.sort(([a], [b]) => a.localeCompare(b));
    for (const [k, v] of entries) {
      kept.append(k, v);
    }

    const query = kept.toString();
    const canonicalUrl = query ? `${host}${path}?${query}` : `${host}${path}`;

    return { canonicalUrl, focusMessageId, host, path };
  } catch {
    return {
      canonicalUrl: rawUrl,
      focusMessageId: null,
      host: '',
      path: '/',
    };
  }
}

export function buildDeepLink(pageUrl: string, messageId: string): string {
  try {
    const url = new URL(pageUrl);
    url.hash = `${EC_MSG_PREFIX}${messageId}`;
    return url.toString();
  } catch {
    const base = pageUrl.split('#')[0];
    return `${base}#${EC_MSG_PREFIX}${messageId}`;
  }
}

const SHARE_MESSAGE_ID = /^[A-Za-z0-9_-]{8,80}$/;

/** Public share URL: `https://everch.at/m/{messageId}`. */
export function buildShareLink(messageId: string): string {
  return `${WWW_ORIGIN}/m/${encodeURIComponent(messageId)}`;
}

export function isShareMessageId(id: string | null | undefined): id is string {
  return Boolean(id && SHARE_MESSAGE_ID.test(id));
}

/** Parse `/m/{messageId}` from a share-page pathname. */
export function parseShareMessageId(
  pathname: string | null | undefined,
): string | null {
  if (!pathname) return null;
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length !== 2 || parts[0] !== 'm') return null;
  const raw = parts[1];
  if (!raw) return null;
  let id: string;
  try {
    id = decodeURIComponent(raw);
  } catch {
    return null;
  }
  return isShareMessageId(id) ? id : null;
}

function looksLikeHttpHost(host: string): boolean {
  const hostname = host.replace(/:\d+$/, '').toLowerCase();
  if (!hostname) return false;
  if (hostname === 'localhost') return true;
  return hostname.includes('.');
}

/**
 * Rebuild a navigable URL from a stored canonical key (`host/path`).
 * Public sites stay `https://`. Browser-internal pages such as
 * `chrome://extensions/` are stored as `extensions/` — do not invent
 * `https://extensions`.
 */
export function httpsUrlFromCanonical(canonicalUrl: string): string {
  const trimmed = canonicalUrl.trim();
  if (!trimmed) return trimmed;
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return trimmed;

  const host = trimmed.split('/')[0]?.split('?')[0] ?? '';
  const scheme = looksLikeHttpHost(host) ? 'https' : 'chrome';
  return `${scheme}://${trimmed}`;
}

const HAS_SCHEME = /^[a-z][a-z0-9+.-]*:/i;

/**
 * Persistable original href from tab.url / location.href.
 * Drops only an Everchat `#ec-msg-` focus hash; other fragments stay.
 */
export function originalHref(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return trimmed;
  try {
    const url = new URL(trimmed);
    if (parseFocusMessageId(url.hash)) {
      url.hash = '';
    }
    return url.href;
  } catch {
    return trimmed;
  }
}

/**
 * URL to open for a stored page: prefer the original href, else reconstruct
 * from canonical_url (https for public hosts, chrome:// for internal keys).
 */
export function hrefFromPage(page: {
  url?: string | null;
  canonical_url: string;
}): string {
  const stored = page.url?.trim();
  if (stored && HAS_SCHEME.test(stored)) return stored;
  return httpsUrlFromCanonical(page.canonical_url);
}

/** Same chat room: both sides already canonicalized (`host/path?kept`). */
export function sameCanonicalRoom(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return Boolean(a && b && a === b);
}
