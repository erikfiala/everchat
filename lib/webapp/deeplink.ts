import { coercePasteUrl, isShareMessageId } from '@/lib/canonicalize';

/** Decode once; return the original string if percent-encoding is malformed. */
export function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export type WebAppBasePath = '/app' | '/chat';

export type WebAppPagePath = {
  base: WebAppBasePath;
  pageId: string;
  messageId: string | null;
};

/**
 * Parse `/app/p/{pageId}` or `/app/p/{pageId}/m/{messageId}` (also `/chat`).
 * Trailing slashes allowed. Invalid ids are ignored (returns null).
 */
export function parseWebAppPagePath(
  pathname: string | null | undefined,
): WebAppPagePath | null {
  if (!pathname) return null;
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length < 3) return null;
  const baseRaw = parts[0];
  if (baseRaw !== 'app' && baseRaw !== 'chat') return null;
  if (parts[1] !== 'p') return null;

  let pageId: string;
  try {
    pageId = decodeURIComponent(parts[2] ?? '');
  } catch {
    return null;
  }
  if (!isShareMessageId(pageId)) return null;

  let messageId: string | null = null;
  if (parts.length >= 5 && parts[3] === 'm') {
    let raw: string;
    try {
      raw = decodeURIComponent(parts[4] ?? '');
    } catch {
      return null;
    }
    if (!isShareMessageId(raw)) return null;
    messageId = raw;
  } else if (parts.length > 3) {
    return null;
  }

  return {
    base: baseRaw === 'chat' ? '/chat' : '/app',
    pageId,
    messageId,
  };
}

/** Build pathname for a short webapp page link (no origin). */
export function webAppPagePathname(
  pageId: string,
  messageId?: string | null,
  base: WebAppBasePath = '/app',
): string | null {
  if (!isShareMessageId(pageId)) return null;
  let path = `${base}/p/${encodeURIComponent(pageId)}`;
  if (messageId && isShareMessageId(messageId)) {
    path += `/m/${encodeURIComponent(messageId)}`;
  }
  return path;
}

/**
 * Coerce a webapp `?url=` query value into an http(s) page URL.
 * Accepts bare hosts via {@link coercePasteUrl}; ignores empty/invalid input.
 */
export function parseWebAppUrlParam(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const direct = coercePasteUrl(trimmed);
  if (direct) return direct;
  const decoded = safeDecodeURIComponent(trimmed);
  if (decoded !== trimmed) return coercePasteUrl(decoded);
  return null;
}

/**
 * Parse optional webapp `?msg=` focus id (not a page-URL hash).
 * Invalid / empty values are ignored.
 */
export function parseWebAppMsgParam(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let id = trimmed;
  try {
    id = decodeURIComponent(trimmed);
  } catch {
    /* keep trimmed */
  }
  return isShareMessageId(id) ? id : null;
}

/** Read `url` + `msg` from a location search string (`?…`). */
export function parseWebAppDeepLinkSearch(search: string): {
  url: string | null;
  messageId: string | null;
} {
  try {
    const params = new URLSearchParams(
      search.startsWith('?') ? search.slice(1) : search,
    );
    return {
      url: parseWebAppUrlParam(params.get('url')),
      messageId: parseWebAppMsgParam(params.get('msg')),
    };
  } catch {
    return { url: null, messageId: null };
  }
}
