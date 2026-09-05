import { describe, expect, it } from 'vitest';
import { canonicalize, parseFocusMessageId, buildDeepLink } from './canonicalize';

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
});
