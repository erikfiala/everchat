import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/pages', () => ({
  getPageById: vi.fn(),
}));

import { getPageById } from '@/lib/pages';
import { installWebAppChrome } from '@/lib/webapp/chrome';

function memoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear: () => map.clear(),
    getItem: (key: string) => (map.has(key) ? map.get(key)! : null),
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
    setItem: (key: string, value: string) => {
      map.set(key, String(value));
    },
  };
}

describe('installWebAppChrome', () => {
  beforeEach(() => {
    vi.mocked(getPageById).mockReset();
    vi.mocked(getPageById).mockResolvedValue(null);
    const store = memoryStorage();
    let href = 'https://everch.at/app';
    const location = {
      get href() {
        return href;
      },
      get pathname() {
        return new URL(href).pathname;
      },
      get search() {
        return new URL(href).search;
      },
      get hash() {
        return new URL(href).hash;
      },
    };
    (globalThis as { localStorage: Storage }).localStorage = store;
    (globalThis as { window: Window }).window = {
      localStorage: store,
      location,
      history: {
        replaceState: (_state: unknown, _title: string, url?: string | null) => {
          if (url) {
            href = new URL(String(url), href).href;
          }
        },
      },
      addEventListener: () => undefined,
    } as unknown as Window;
    delete (globalThis as { browser?: unknown }).browser;
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  afterEach(() => {
    delete (globalThis as { localStorage?: Storage }).localStorage;
    delete (globalThis as { window?: Window }).window;
    delete (globalThis as { browser?: unknown }).browser;
    delete (globalThis as { chrome?: unknown }).chrome;
  });

  it('SET_ACTIVE_TAB_URL coerces paste and emits TAB_UPDATED', async () => {
    installWebAppChrome();
    const onMessage = vi.fn();
    browser.runtime.onMessage.addListener(onMessage);

    const res = await browser.runtime.sendMessage({
      type: 'SET_ACTIVE_TAB_URL',
      url: 'example.com/story',
    });

    expect(res.ok).toBe(true);
    expect(res.url).toBe('https://example.com/story');
    expect(res.canonicalUrl).toBe('example.com/story');
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'TAB_UPDATED',
        url: 'https://example.com/story',
        canonicalUrl: 'example.com/story',
      }),
    );
    expect(localStorage.getItem('ec-webapp-last-url')).toBe(
      'https://example.com/story',
    );
  });

  it('tabs.create stays in-app by updating the virtual tab', async () => {
    installWebAppChrome();
    const onMessage = vi.fn();
    browser.runtime.onMessage.addListener(onMessage);

    const tab = await browser.tabs.create({
      url: 'https://news.ycombinator.com/item?id=1',
    });
    expect(tab.id).toBe(1);

    const active = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    expect(active.canonicalUrl).toBe('news.ycombinator.com/item?id=1');
    expect(onMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'TAB_UPDATED' }),
    );
  });

  it('boots from ?url= deep link', async () => {
    window.history.replaceState(
      null,
      '',
      '/app?url=' + encodeURIComponent('https://example.com/a'),
    );
    installWebAppChrome();
    const active = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    expect(active.url).toBe('https://example.com/a');
    expect(active.canonicalUrl).toBe('example.com/a');
  });

  it('boots from ?url=&msg= and keeps the address bar in sync', async () => {
    const id = 'abc-def-ghi';
    window.history.replaceState(
      null,
      '',
      '/app?url=' +
        encodeURIComponent('https://example.com/a') +
        '&msg=' +
        encodeURIComponent(id),
    );
    installWebAppChrome();
    const active = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    expect(active.url).toBe('https://example.com/a');
    expect(active.focusMessageId).toBe(id);
    expect(window.location.search).toContain('msg=' + encodeURIComponent(id));

    await browser.runtime.sendMessage({ type: 'CLEAR_FOCUS_MESSAGE' });
    expect(window.location.search).not.toContain('msg=');
    expect(window.location.search).toContain(
      'url=' + encodeURIComponent('https://example.com/a'),
    );
  });

  it('SET_ACTIVE_TAB_URL updates ?url= via replaceState', async () => {
    installWebAppChrome();
    await browser.runtime.sendMessage({
      type: 'SET_ACTIVE_TAB_URL',
      url: 'https://news.example/story',
    });
    expect(window.location.search).toBe(
      '?url=' + encodeURIComponent('https://news.example/story'),
    );
  });

  it('SET_ACTIVE_PAGE_ID keeps ?url= once a page URL is known', async () => {
    const pageId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    installWebAppChrome();
    await browser.runtime.sendMessage({
      type: 'SET_ACTIVE_TAB_URL',
      url: 'https://news.example/story',
    });
    await browser.runtime.sendMessage({
      type: 'SET_ACTIVE_PAGE_ID',
      pageId,
    });
    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toBe(
      '?url=' + encodeURIComponent('https://news.example/story'),
    );
  });

  it('focus uses ?msg= while a page URL is known', async () => {
    const pageId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const msgId = 'm1b2c3d4-e5f6-7890-abcd-ef1234567890';
    installWebAppChrome();
    await browser.runtime.sendMessage({
      type: 'SET_ACTIVE_TAB_URL',
      url: 'https://news.example/story',
    });
    await browser.runtime.sendMessage({
      type: 'SET_ACTIVE_PAGE_ID',
      pageId,
    });
    await browser.runtime.sendMessage({
      type: 'OPEN_PANEL_FOR_TAB',
      focusMessageId: msgId,
    });
    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toBe(
      '?url=' +
        encodeURIComponent('https://news.example/story') +
        '&msg=' +
        encodeURIComponent(msgId),
    );

    await browser.runtime.sendMessage({ type: 'CLEAR_FOCUS_MESSAGE' });
    expect(window.location.pathname).toBe('/app');
    expect(window.location.search).toBe(
      '?url=' + encodeURIComponent('https://news.example/story'),
    );
  });

  it('resolves /app/p/{id} to ?url= after the page loads', async () => {
    const pageId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const pageUrl =
      'https://store.steampowered.com/app/1762570/Space_Reign';
    vi.mocked(getPageById).mockResolvedValue({
      id: pageId,
      url: pageUrl,
      canonical_url: 'store.steampowered.com/app/1762570/Space_Reign',
      title: 'Space Reign on Steam',
      favicon_url: null,
    } as Awaited<ReturnType<typeof getPageById>>);
    window.history.replaceState(null, '', `/app/p/${pageId}`);
    installWebAppChrome();
    expect(window.location.pathname).toBe(`/app/p/${pageId}`);

    await vi.waitFor(() => {
      expect(window.location.pathname).toBe('/app');
      expect(window.location.search).toBe(
        '?url=' + encodeURIComponent(pageUrl),
      );
    });
    const active = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    expect(active.url).toBe(pageUrl);
    expect(active.title).toBe('Space Reign on Steam');
  });

  it('boots focus from /app/p/{id}/m/{msg} before page resolve', async () => {
    const pageId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const msgId = 'm1b2c3d4-e5f6-7890-abcd-ef1234567890';
    window.history.replaceState(null, '', `/app/p/${pageId}/m/${msgId}`);
    installWebAppChrome();
    const active = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    expect(active.focusMessageId).toBe(msgId);
    expect(window.location.pathname).toBe(`/app/p/${pageId}/m/${msgId}`);
  });

  it('ignores invalid ?url= without crashing', async () => {
    window.history.replaceState(null, '', '/app?url=javascript:alert(1)');
    installWebAppChrome();
    const active = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
    expect(active.url).toBeUndefined();
  });
});
