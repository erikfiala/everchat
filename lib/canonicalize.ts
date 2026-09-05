import { EC_MSG_PREFIX, TRACKING_PARAM_DENYLIST } from './constants';

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

export function httpsUrlFromCanonical(canonicalUrl: string): string {
  return `https://${canonicalUrl}`;
}
