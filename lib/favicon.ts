const GOOGLE_S2 = 'https://www.google.com/s2/favicons';

function isHttpUrl(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      Boolean(url.hostname)
    );
  } catch {
    return false;
  }
}

/** True when `src` is already a Google s2 favicon URL (do not re-wrap). */
export function isGoogleS2FaviconUrl(src: string): boolean {
  try {
    const url = new URL(src);
    return (
      (url.hostname === 'www.google.com' || url.hostname === 'google.com') &&
      url.pathname === '/s2/favicons'
    );
  } catch {
    return false;
  }
}

/** Google s2 URL for an http(s) favicon so CORP-blocked origins still render. */
export function googleS2FaviconUrl(src: string): string | null {
  if (!isHttpUrl(src) || isGoogleS2FaviconUrl(src)) return null;
  return `${GOOGLE_S2}?sz=32&domain_url=${encodeURIComponent(src)}`;
}

/** Google s2 URL from a bare hostname (webapp paste / virtual tab). */
export function googleS2FaviconForHost(host: string): string | null {
  const hostname = host.trim().toLowerCase().replace(/^www\./, '');
  if (!hostname || hostname.includes('/') || hostname.includes(' ')) {
    return null;
  }
  return `${GOOGLE_S2}?sz=32&domain=${encodeURIComponent(hostname)}`;
}

/**
 * Prefer a usable stored favicon; otherwise derive Google s2 from page URL / host.
 * Used when upserting `pages.favicon_url` and when marketing cards lack one.
 */
export function resolveFaviconUrl(input: {
  faviconUrl?: string | null;
  url?: string | null;
  canonicalUrl?: string | null;
}): string | null {
  const direct = input.faviconUrl?.trim();
  // Only persist/load http(s) icons — chrome-extension / data / blob can't render on www.
  if (direct && isHttpUrl(direct)) return direct;

  const fromUrl = input.url?.trim();
  if (fromUrl) {
    try {
      const host = new URL(fromUrl).hostname;
      const google = googleS2FaviconForHost(host);
      if (google) return google;
    } catch {
      /* fall through */
    }
  }

  const canon = input.canonicalUrl?.trim();
  if (canon) {
    const host = canon.split('/')[0] ?? '';
    const google = googleS2FaviconForHost(host);
    if (google) return google;
  }

  return null;
}

/**
 * Ordered `<img>` srcs for a stored favicon URL.
 * Google s2 first so hotlink/CORP blocks never hit the image tag.
 * The stored URL is last so a direct load still works if Google misses.
 * Already-proxied Google s2 URLs are used as-is (re-wrapping yields a default globe).
 */
export function faviconSrcCandidates(src?: string | null): string[] {
  const stored = src?.trim();
  if (!stored) return [];
  if (isGoogleS2FaviconUrl(stored)) return [stored];
  const google = googleS2FaviconUrl(stored);
  if (google && google !== stored) return [google, stored];
  return [stored];
}

/**
 * Display candidates for a page/room row: host Google s2 first, then stored URL.
 * Keep in sync with `www/rooms.js` (`rowFaviconCandidates`).
 */
export function pageFaviconSrcCandidates(input: {
  faviconUrl?: string | null;
  url?: string | null;
  canonicalUrl?: string | null;
}): string[] {
  const candidates = faviconSrcCandidates(resolveFaviconUrl(input));
  let host = '';
  const fromUrl = input.url?.trim();
  if (fromUrl) {
    try {
      host = new URL(fromUrl).hostname;
    } catch {
      host = '';
    }
  }
  if (!host) {
    host = input.canonicalUrl?.trim().split('/')[0] ?? '';
  }
  const hostGoogle = host ? googleS2FaviconForHost(host) : null;
  if (hostGoogle && !candidates.includes(hostGoogle)) {
    return [hostGoogle, ...candidates];
  }
  return candidates;
}
