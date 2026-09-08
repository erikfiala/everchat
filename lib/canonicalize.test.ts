import { describe, expect, it } from 'vitest';
import {
  canonicalize,
  parseFocusMessageId,
  buildDeepLink,
  buildShareLink,
  httpsUrlFromCanonical,
  originalHref,
  hrefFromPage,
  parseShareMessageId,
  sameCanonicalRoom,
  displayUrl,
  hostFromCanonical,
} from './canonicalize';

describe('canonicalize', () => {
  it('strips www, protocol, utm, and hash for identity', () => {
    const r = canonicalize(
      'https://www.nytimes.com/2026/01/01/world/foo.html?utm_source=twitter#comments',
    );
    expect(r.canonicalUrl).toBe('nytimes.com/2026/01/01/world/foo.html');
    expect(r.focusMessageId).toBeNull();
  });

  it('keeps meaningful query params and strips youtube noise', () => {
    const r = canonicalize(
      'https://www.youtube.com/watch?v=abc&t=30s&si=xyz',
    );
    expect(r.canonicalUrl).toBe('youtube.com/watch?v=abc');
  });

  it('keeps HN id and strips utm', () => {
    const r = canonicalize(
      'https://news.ycombinator.com/item?id=123&utm_source=share',
    );
    expect(r.canonicalUrl).toBe('news.ycombinator.com/item?id=123');
  });

  it('parses ec-msg focus without affecting canon', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const r = canonicalize(
      `https://www.nytimes.com/2026/01/01/world/foo.html#ec-msg-${id}`,
    );
    expect(r.canonicalUrl).toBe('nytimes.com/2026/01/01/world/foo.html');
    expect(r.focusMessageId).toBe(id);
  });

  it('stores chrome-internal pages as host/path without scheme', () => {
    const r = canonicalize('chrome://extensions/');
    expect(r.canonicalUrl).toBe('extensions/');
    expect(r.host).toBe('extensions');
  });
});

describe('parseFocusMessageId', () => {
  it('reads hash', () => {
    expect(parseFocusMessageId('#ec-msg-abc-def-ghi')).toBe('abc-def-ghi');
  });
});

describe('buildDeepLink', () => {
  it('appends hash', () => {
    expect(buildDeepLink('https://example.com/a', 'xyz')).toBe(
      'https://example.com/a#ec-msg-xyz',
    );
  });

  it('appends hash on chrome-internal pages', () => {
    expect(buildDeepLink('chrome://extensions/', 'xyz')).toBe(
      'chrome://extensions/#ec-msg-xyz',
    );
  });
});

describe('buildShareLink', () => {
  it('uses the public everch.at /m/{id} path', () => {
    const id = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    expect(buildShareLink(id)).toBe(`https://everch.at/m/${id}`);
  });
});

describe('parseShareMessageId', () => {
  it('reads /m/{id}', () => {
    expect(parseShareMessageId('/m/abc-def-ghi')).toBe('abc-def-ghi');
    expect(parseShareMessageId('/m/abc-def-ghi/')).toBe('abc-def-ghi');
  });

  it('rejects missing or short ids', () => {
    expect(parseShareMessageId('/m')).toBeNull();
    expect(parseShareMessageId('/m/short')).toBeNull();
    expect(parseShareMessageId('/privacy')).toBeNull();
  });
});

describe('httpsUrlFromCanonical', () => {
  it('rebuilds https URLs for public hosts', () => {
    expect(httpsUrlFromCanonical('chromewebstore.google.com/category/extensions')).toBe(
      'https://chromewebstore.google.com/category/extensions',
    );
    expect(httpsUrlFromCanonical('localhost:3000/app')).toBe(
      'https://localhost:3000/app',
    );
  });

  it('rebuilds chrome:// for browser-internal pages', () => {
    expect(httpsUrlFromCanonical('extensions/')).toBe('chrome://extensions/');
    expect(httpsUrlFromCanonical('settings/help')).toBe('chrome://settings/help');
  });

  it('leaves already-absolute URLs alone', () => {
    expect(httpsUrlFromCanonical('https://example.com/a')).toBe(
      'https://example.com/a',
    );
  });
});

describe('originalHref', () => {
  it('keeps the real page href including scheme and query', () => {
    expect(originalHref('https://www.example.com/foo?id=1#comments')).toBe(
      'https://www.example.com/foo?id=1#comments',
    );
    expect(originalHref('https://chromewebstore.google.com/detail/abc')).toBe(
      'https://chromewebstore.google.com/detail/abc',
    );
    expect(originalHref('chrome://extensions/')).toBe('chrome://extensions/');
  });

  it('strips only an Everchat focus hash', () => {
    expect(originalHref('https://example.com/foo#ec-msg-xyzxyzxy')).toBe(
      'https://example.com/foo',
    );
  });
});

describe('hrefFromPage', () => {
  it('prefers the stored original href as-is', () => {
    expect(
      hrefFromPage({
        url: 'https://chromewebstore.google.com/detail/abc',
        canonical_url: 'extensions/',
      }),
    ).toBe('https://chromewebstore.google.com/detail/abc');
  });

  it('falls back to https for public canonical keys', () => {
    expect(
      hrefFromPage({ url: null, canonical_url: 'example.com/foo' }),
    ).toBe('https://example.com/foo');
  });

  it('falls back to chrome:// for internal keys without a message hash', () => {
    expect(hrefFromPage({ url: null, canonical_url: 'extensions/' })).toBe(
      'chrome://extensions/',
    );
  });
});

describe('displayUrl', () => {
  it('strips trailing slashes from canonical keys and hrefs', () => {
    expect(displayUrl('erikfiala.com/')).toBe('erikfiala.com');
    expect(displayUrl('extensions/')).toBe('extensions');
    expect(displayUrl('https://erikfiala.com/')).toBe('https://erikfiala.com');
    expect(displayUrl('https://example.com/about/')).toBe(
      'https://example.com/about',
    );
  });

  it('leaves paths and empty values alone', () => {
    expect(displayUrl('nytimes.com/2026/01/01/world/foo.html')).toBe(
      'nytimes.com/2026/01/01/world/foo.html',
    );
    expect(displayUrl('')).toBe('');
    expect(displayUrl(null)).toBe('');
    expect(displayUrl('/')).toBe('/');
  });
});

describe('hostFromCanonical', () => {
  it('returns the host without a trailing slash', () => {
    expect(hostFromCanonical('erikfiala.com/')).toBe('erikfiala.com');
    expect(hostFromCanonical('extensions/')).toBe('extensions');
    expect(hostFromCanonical('nytimes.com/2026/01/01/world/foo.html')).toBe(
      'nytimes.com',
    );
  });
});

describe('sameCanonicalRoom', () => {
  it('matches already-canonical keys and rejects missing ones', () => {
    expect(
      sameCanonicalRoom('youtube.com/watch?v=abc', 'youtube.com/watch?v=abc'),
    ).toBe(true);
    expect(
      sameCanonicalRoom('youtube.com/watch?v=abc', 'youtube.com/watch?v=xyz'),
    ).toBe(false);
    expect(sameCanonicalRoom(null, 'youtube.com/watch?v=abc')).toBe(false);
    expect(sameCanonicalRoom('', '')).toBe(false);
  });

  it('follows canonicalize identity (www, slash, youtube noise)', () => {
    const live = canonicalize(
      'https://www.youtube.com/watch?v=abc&t=30s&si=xyz/',
    );
    const viewing = canonicalize('https://youtube.com/watch?v=abc');
    expect(sameCanonicalRoom(live.canonicalUrl, viewing.canonicalUrl)).toBe(
      true,
    );
    expect(
      sameCanonicalRoom(
        live.canonicalUrl,
        canonicalize('https://youtube.com/watch?v=other').canonicalUrl,
      ),
    ).toBe(false);
  });

  it('mirrors chat history: tag only when viewing matches the live tab', () => {
    const live = canonicalize('https://www.youtube.com/watch?v=abc').canonicalUrl;
    const previous = canonicalize(
      'https://www.nytimes.com/2026/01/01/world/foo.html/',
    ).canonicalUrl;
    expect(sameCanonicalRoom(live, live)).toBe(true);
    expect(sameCanonicalRoom(previous, live)).toBe(false);
    expect(sameCanonicalRoom(live, live)).toBe(true);
  });
});
