/**
 * Astro-style sitemap index: sitemap-index.xml points at sitemap-0.xml, sitemap-1.xml, …
 * @see https://developers.google.com/search/docs/crawling-indexing/sitemaps/large-sitemaps
 */

export const SITE = 'https://everch.at';
export const CHUNK_SIZE = 45_000;
export const DEFAULT_THEME_SLUG = 'everchat';
export const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;

/** Public indexable paths. Homepage canonical is the origin with no trailing slash. */
export const STATIC_PATHS = [
  '',
  '/chats',
  '/themes',
  '/themes/new',
  '/privacy',
  '/terms',
];

export function escapeXml(value) {
  return String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function locFor(path) {
  return path ? SITE + path : SITE;
}

export function lastmodDate(value) {
  if (!value) return '';
  const iso = typeof value === 'string' ? value : '';
  const day = iso.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : '';
}

export function themePath(slug) {
  return '/themes/' + slug;
}

/**
 * @param {{ slug?: string, created_at?: string }[]} themes
 * @returns {{ loc: string, lastmod?: string }[]}
 */
export function collectEntries(themes) {
  const entries = STATIC_PATHS.map((path) => ({ loc: locFor(path) }));
  const seen = new Set(entries.map((entry) => entry.loc));

  function addTheme(slug, createdAt) {
    if (!slug || !SLUG_RE.test(slug)) return;
    const loc = locFor(themePath(slug));
    if (seen.has(loc)) return;
    seen.add(loc);
    const lastmod = lastmodDate(createdAt);
    entries.push(lastmod ? { loc, lastmod } : { loc });
  }

  for (const row of themes || []) {
    addTheme(row && row.slug, row && row.created_at);
  }
  addTheme(DEFAULT_THEME_SLUG);
  return entries;
}

export function chunkEntries(entries, size = CHUNK_SIZE) {
  const chunks = [];
  const list = entries || [];
  if (list.length === 0) return [[]];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
}

function urlXml(entry) {
  const lastmod = entry.lastmod
    ? `\n    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`
    : '';
  return `  <url>\n    <loc>${escapeXml(entry.loc)}</loc>${lastmod}\n  </url>`;
}

export function urlsetXml(entries) {
  const body = (entries || []).map(urlXml).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
}

export function sitemapIndexXml(chunkCount, origin = SITE) {
  const count = Math.max(1, chunkCount | 0);
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push(
      `  <sitemap>\n    <loc>${escapeXml(origin + '/sitemap-' + i + '.xml')}</loc>\n  </sitemap>`,
    );
  }
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${items.join('\n')}\n</sitemapindex>\n`;
}

export function renderSitemaps(entries, size = CHUNK_SIZE) {
  const chunks = chunkEntries(entries, size);
  const files = {
    'sitemap-index.xml': sitemapIndexXml(chunks.length),
    'sitemap.xml': sitemapIndexXml(chunks.length),
  };
  chunks.forEach((chunk, i) => {
    files['sitemap-' + i + '.xml'] = urlsetXml(chunk);
  });
  return files;
}
