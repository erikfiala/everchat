import { beforeEach, describe, expect, it, vi } from 'vitest';

const maybeSingle = vi.fn();
const insertSingle = vi.fn();
const updateSingle = vi.fn();

vi.mock('./supabase', () => ({
  isSupabaseConfigured: true,
  getSupabase: () => ({
    from: (table: string) => {
      if (table !== 'pages') {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: () => ({
          eq: () => ({
            maybeSingle,
          }),
        }),
        insert: (row: unknown) => ({
          select: () => ({
            single: async () => insertSingle(row),
          }),
        }),
        update: (patch: unknown) => ({
          eq: () => ({
            select: () => ({
              single: async () => updateSingle(patch),
            }),
          }),
        }),
      };
    },
  }),
}));

import {
  ensurePageForPost,
  resolvePageFavicon,
  resolvePageForView,
} from './pages';

describe('resolvePageFavicon', () => {
  it('prefers an explicit favicon URL', () => {
    expect(
      resolvePageFavicon({
        faviconUrl: 'https://cdn.example/icon.png',
        url: 'https://example.com/a',
        canonicalUrl: 'example.com/a',
      }),
    ).toBe('https://cdn.example/icon.png');
  });

  it('derives a host favicon when tab favicon is missing', () => {
    expect(
      resolvePageFavicon({
        faviconUrl: null,
        url: 'https://news.example/story',
        canonicalUrl: 'news.example/story',
      }),
    ).toBe(
      'https://www.google.com/s2/favicons?sz=32&domain=news.example',
    );
  });

  it('ignores non-http tab favicons so a host icon is stored instead', () => {
    expect(
      resolvePageFavicon({
        faviconUrl: 'chrome-extension://id/fav.png',
        url: 'https://example.com/a',
        canonicalUrl: 'example.com/a',
      }),
    ).toBe('https://www.google.com/s2/favicons?sz=32&domain=example.com');
  });
});

describe('resolvePageForView vs ensurePageForPost', () => {
  beforeEach(() => {
    maybeSingle.mockReset();
    insertSingle.mockReset();
    updateSingle.mockReset();
  });

  it('view lookup never inserts when no page row exists', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const page = await resolvePageForView('example.com/new-room');
    expect(page).toBeNull();
    expect(insertSingle).not.toHaveBeenCalled();
    expect(updateSingle).not.toHaveBeenCalled();
  });

  it('view lookup returns an existing page without writing', async () => {
    const existing = {
      id: 'page-1',
      canonical_url: 'example.com/a',
      url: 'https://example.com/a',
      title: 'A',
      description: null,
      favicon_url: 'https://cdn.example/i.png',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    maybeSingle.mockResolvedValue({ data: existing, error: null });

    const page = await resolvePageForView('example.com/a');
    expect(page).toEqual(existing);
    expect(insertSingle).not.toHaveBeenCalled();
    expect(updateSingle).not.toHaveBeenCalled();
  });

  it('first post upserts a pages row with favicon from context', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });
    const created = {
      id: 'page-new',
      canonical_url: 'example.com/first',
      url: 'https://example.com/first',
      title: 'First',
      description: null,
      favicon_url: 'https://cdn.example/tab.png',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    insertSingle.mockResolvedValue({ data: created, error: null });

    const page = await ensurePageForPost({
      canonicalUrl: 'example.com/first',
      url: 'https://example.com/first',
      title: 'First',
      faviconUrl: 'https://cdn.example/tab.png',
    });

    expect(page).toEqual(created);
    expect(insertSingle).toHaveBeenCalledTimes(1);
    expect(insertSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        canonical_url: 'example.com/first',
        url: 'https://example.com/first',
        title: 'First',
        favicon_url: 'https://cdn.example/tab.png',
      }),
    );
  });

  it('later upsert fills a missing favicon without blanking title', async () => {
    const existing = {
      id: 'page-1',
      canonical_url: 'example.com/a',
      url: 'https://example.com/a',
      title: 'Existing',
      description: null,
      favicon_url: null,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    maybeSingle.mockResolvedValue({ data: existing, error: null });
    const updated = {
      ...existing,
      favicon_url: 'https://www.google.com/s2/favicons?sz=32&domain=example.com',
      updated_at: '2026-01-02T00:00:00Z',
    };
    updateSingle.mockResolvedValue({ data: updated, error: null });

    const page = await ensurePageForPost({
      canonicalUrl: 'example.com/a',
      url: 'https://example.com/a',
      title: null,
      faviconUrl: null,
    });

    expect(updateSingle).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Existing',
        favicon_url:
          'https://www.google.com/s2/favicons?sz=32&domain=example.com',
      }),
    );
    expect(page.favicon_url).toBe(updated.favicon_url);
  });
});
