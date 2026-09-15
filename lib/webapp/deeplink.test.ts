import { describe, expect, it } from 'vitest';
import {
  parseWebAppDeepLinkSearch,
  parseWebAppMsgParam,
  parseWebAppPagePath,
  parseWebAppUrlParam,
  safeDecodeURIComponent,
  webAppPagePathname,
} from '@/lib/webapp/deeplink';

describe('safeDecodeURIComponent', () => {
  it('decodes valid percent-encoding', () => {
    expect(safeDecodeURIComponent('https%3A%2F%2Fexample.com%2Fa')).toBe(
      'https://example.com/a',
    );
  });

  it('returns the original string on malformed encoding', () => {
    expect(safeDecodeURIComponent('%E0%A4%A')).toBe('%E0%A4%A');
  });
});

describe('parseWebAppUrlParam', () => {
  it('accepts absolute https URLs', () => {
    expect(parseWebAppUrlParam('https://example.com/a')).toBe(
      'https://example.com/a',
    );
  });

  it('coerces bare hosts', () => {
    expect(parseWebAppUrlParam('example.com/story')).toBe(
      'https://example.com/story',
    );
  });

  it('tolerates an extra encode layer', () => {
    expect(parseWebAppUrlParam('https%3A%2F%2Fexample.com%2Fa')).toBe(
      'https://example.com/a',
    );
  });

  it('ignores empty and invalid values', () => {
    expect(parseWebAppUrlParam(null)).toBeNull();
    expect(parseWebAppUrlParam('')).toBeNull();
    expect(parseWebAppUrlParam('   ')).toBeNull();
    expect(parseWebAppUrlParam('javascript:alert(1)')).toBeNull();
    expect(parseWebAppUrlParam('not a host')).toBeNull();
  });
});

describe('parseWebAppMsgParam', () => {
  it('accepts share-safe message ids', () => {
    expect(parseWebAppMsgParam('abc-def-ghi')).toBe('abc-def-ghi');
  });

  it('ignores empty / short / invalid ids', () => {
    expect(parseWebAppMsgParam(null)).toBeNull();
    expect(parseWebAppMsgParam('')).toBeNull();
    expect(parseWebAppMsgParam('short')).toBeNull();
    expect(parseWebAppMsgParam('bad id!!')).toBeNull();
  });
});

describe('parseWebAppDeepLinkSearch', () => {
  it('reads url and msg from a query string', () => {
    const q =
      '?url=' +
      encodeURIComponent('https://news.example/story') +
      '&msg=abc-def-ghi';
    expect(parseWebAppDeepLinkSearch(q)).toEqual({
      url: 'https://news.example/story',
      messageId: 'abc-def-ghi',
    });
  });

  it('returns nulls when params are missing or bad', () => {
    expect(parseWebAppDeepLinkSearch('')).toEqual({
      url: null,
      messageId: null,
    });
    expect(parseWebAppDeepLinkSearch('?url=&msg=')).toEqual({
      url: null,
      messageId: null,
    });
    expect(parseWebAppDeepLinkSearch('?url=javascript:x&msg=nope')).toEqual({
      url: null,
      messageId: null,
    });
  });
});

describe('parseWebAppPagePath', () => {
  const pageId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const msgId = 'm1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('parses /app/p/{pageId}', () => {
    expect(parseWebAppPagePath(`/app/p/${pageId}`)).toEqual({
      base: '/app',
      pageId,
      messageId: null,
    });
  });

  it('parses /app/p/{pageId}/m/{messageId} with trailing slash', () => {
    expect(parseWebAppPagePath(`/app/p/${pageId}/m/${msgId}/`)).toEqual({
      base: '/app',
      pageId,
      messageId: msgId,
    });
  });

  it('parses /chat alias', () => {
    expect(parseWebAppPagePath(`/chat/p/${pageId}`)).toEqual({
      base: '/chat',
      pageId,
      messageId: null,
    });
  });

  it('rejects invalid or incomplete paths', () => {
    expect(parseWebAppPagePath('/app')).toBeNull();
    expect(parseWebAppPagePath('/app/p/short')).toBeNull();
    expect(parseWebAppPagePath(`/app/p/${pageId}/x/${msgId}`)).toBeNull();
    expect(parseWebAppPagePath('/panel/p/' + pageId)).toBeNull();
  });
});

describe('webAppPagePathname', () => {
  const pageId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
  const msgId = 'm1b2c3d4-e5f6-7890-abcd-ef1234567890';

  it('builds short room and comment paths', () => {
    expect(webAppPagePathname(pageId)).toBe(`/app/p/${pageId}`);
    expect(webAppPagePathname(pageId, msgId)).toBe(
      `/app/p/${pageId}/m/${msgId}`,
    );
    expect(webAppPagePathname(pageId, null, '/chat')).toBe(`/chat/p/${pageId}`);
  });

  it('returns null for invalid page ids', () => {
    expect(webAppPagePathname('short')).toBeNull();
  });
});
