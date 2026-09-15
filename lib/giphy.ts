/** Giphy hosts: i.giphy.com, media*.giphy.com, giphy.com, … */
const GIPHY_HOST = /^(?:[a-z0-9-]+\.)?giphy\.com$/i;
const GIPHY_ID = /^[A-Za-z0-9]{4,32}$/;
const RESERVED_SEGMENTS = new Set([
  'api',
  'clips',
  'embed',
  'gifs',
  'giphy',
  'i',
  'media',
  'source',
  'stickers',
  'www',
]);

function isGiphyId(value: string): boolean {
  return GIPHY_ID.test(value) && !RESERVED_SEGMENTS.has(value.toLowerCase());
}

/**
 * Public Giphy id from a CDN / embed / page URL.
 * API `images.original.url` values look like
 * `https://media*.giphy.com/media/v1.Y2lk…/{id}/giphy.gif?cid=…` and can
 * 403 from extension and unknown web referrers. The id is the last
 * directory before the rendition filename.
 */
export function extractGiphyId(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;
  if (!GIPHY_HOST.test(url.hostname)) return null;

  const parts = url.pathname.split('/').filter(Boolean);
  if (!parts.length) return null;

  // https://i.giphy.com/{id}.gif
  if (parts.length === 1) {
    const fileMatch = parts[0]?.match(
      /^([A-Za-z0-9]{4,32})\.(?:gif|webp|mp4)$/i,
    );
    if (fileMatch?.[1] && isGiphyId(fileMatch[1])) return fileMatch[1];
  }

  // /media/v1.…/{id}/giphy.gif  or  /media/{id}/200w.gif
  if (parts.length >= 2) {
    const candidate = parts[parts.length - 2] ?? '';
    if (isGiphyId(candidate)) return candidate;
  }

  // https://giphy.com/gifs/{slug}-{id}  or  /embed/{id}
  const kind = parts[0];
  if ((kind === 'gifs' || kind === 'embed') && parts[1]) {
    const slug = parts[1];
    const tail = slug.split('-').pop() ?? '';
    if (isGiphyId(tail)) return tail;
  }

  return null;
}

/** Stable original embed. Prefer this over API `original.url` (cid / v1 paths). */
export function giphyGifUrl(id: string): string {
  return `https://i.giphy.com/${id}.gif`;
}

/** Smaller rendition for picker thumbs. */
export function giphyPreviewUrl(id: string): string {
  return `https://i.giphy.com/media/${id}/200w.gif`;
}

/**
 * Rewrite a stored/API Giphy URL to `https://i.giphy.com/{id}.gif`.
 * Non-Giphy http(s) URLs are returned trimmed; empty input is null.
 */
export function normalizeGifUrl(
  raw: string | null | undefined,
): string | null {
  const stored = raw?.trim();
  if (!stored) return null;
  const id = extractGiphyId(stored);
  return id ? giphyGifUrl(id) : stored;
}

/** Same rewrite, but a 200w preview when the id is known. */
export function normalizeGifPreviewUrl(
  raw: string | null | undefined,
): string | null {
  const stored = raw?.trim();
  if (!stored) return null;
  const id = extractGiphyId(stored);
  return id ? giphyPreviewUrl(id) : stored;
}
