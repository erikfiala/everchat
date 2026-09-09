import { describe, expect, it } from 'vitest';
import {
  CHUNK_SIZE,
  SITE,
  chunkEntries,
  collectEntries,
  escapeXml,
  locFor,
  renderSitemaps,
  sitemapIndexXml,
  urlsetXml,
} from './sitemap.mjs';

describe('collectEntries', () => {
  it('lists static pages and the default theme once', () => {
    const locs = collectEntries([]).map((entry) => entry.loc);
    expect(locs).toEqual([
      'https://everch.at',
      'https://everch.at/chats',
      'https://everch.at/themes',
      'https://everch.at/themes/new',
      'https://everch.at/privacy',
      'https://everch.at/terms',
      'https://everch.at/themes/everchat',
    ]);
  });

  it('appends published themes and skips duplicate default + bad slugs', () => {
    const entries = collectEntries([
      { slug: 'everchat', created_at: '2020-01-01T00:00:00+00:00' },
      { slug: 'midnight-ink', created_at: '2026-09-09T12:00:00Z' },
      { slug: 'NOPE' },
      { slug: 'a' },
    ]);
    const locs = entries.map((entry) => entry.loc);
    expect(locs).toContain('https://everch.at/themes');
    expect(locs.filter((loc) => loc.includes('/themes/'))).toEqual([
      'https://everch.at/themes/new',
      'https://everch.at/themes/everchat',
      'https://everch.at/themes/midnight-ink',
    ]);
    expect(entries.find((entry) => entry.loc.endsWith('/everchat'))?.lastmod).toBe('2020-01-01');
    expect(entries.find((entry) => entry.loc.endsWith('/midnight-ink'))?.lastmod).toBe(
      '2026-09-09',
    );
  });
});

describe('xml', () => {
  it('escapes loc values', () => {
    expect(escapeXml('https://everch.at/a&b')).toBe('https://everch.at/a&amp;b');
    expect(urlsetXml([{ loc: locFor('/a&b') }])).toContain(
      '<loc>https://everch.at/a&amp;b</loc>',
    );
  });

  it('emits an Astro-style index of numbered sitemaps', () => {
    const xml = sitemapIndexXml(2);
    expect(xml).toContain('<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain(`${SITE}/sitemap-0.xml`);
    expect(xml).toContain(`${SITE}/sitemap-1.xml`);
    expect(xml).not.toContain('sitemap-2.xml');
  });

  it('chunks at the Astro 45k limit and always writes an index', () => {
    expect(CHUNK_SIZE).toBe(45_000);
    const files = renderSitemaps(
      [
        { loc: 'https://everch.at/a' },
        { loc: 'https://everch.at/b' },
        { loc: 'https://everch.at/c' },
      ],
      2,
    );
    expect(Object.keys(files).sort()).toEqual([
      'sitemap-0.xml',
      'sitemap-1.xml',
      'sitemap-index.xml',
      'sitemap.xml',
    ]);
    expect(files['sitemap-0.xml']).toContain('/a</loc>');
    expect(files['sitemap-0.xml']).toContain('/b</loc>');
    expect(files['sitemap-1.xml']).toContain('/c</loc>');
    expect(files['sitemap.xml']).toBe(files['sitemap-index.xml']);
  });

  it('keeps a single empty chunk rather than zero files', () => {
    expect(chunkEntries([]).length).toBe(1);
  });
});
