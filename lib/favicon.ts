const GOOGLE_S2 = 'https://www.google.com/s2/favicons';

/** Google s2 URL for an http(s) favicon so CORP-blocked origins still render. */
export function googleS2FaviconUrl(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
    if (!url.hostname) return null;
    return `${GOOGLE_S2}?sz=32&domain_url=${encodeURIComponent(src)}`;
  } catch {
    return null;
  }
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
 * Ordered `<img>` srcs for a stored favicon URL.
 * Google s2 first so hotlink/CORP blocks never hit the image tag.
 * The stored URL is last so a direct load still works if Google misses.
 */
export function faviconSrcCandidates(src?: string | null): string[] {
  const stored = src?.trim();
  if (!stored) return [];
  const google = googleS2FaviconUrl(stored);
  if (google && google !== stored) return [google, stored];
  return [stored];
}
