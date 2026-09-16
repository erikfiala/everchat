import { describe, expect, it } from 'vitest';
import {
  faviconSrcCandidates,
  googleS2FaviconForHost,
  googleS2FaviconUrl,
  isGoogleS2FaviconUrl,
  pageFaviconSrcCandidates,
  resolveFaviconUrl,
} from './favicon';

const TRUMP =
  'https://www.donaldjtrump.com/assets/images/favicon/favicon.ico';
const TRUMP_S2 =
  'https://www.google.com/s2/favicons?sz=32&domain=donaldjtrump.com';

describe('googleS2FaviconUrl', () => {
  it('wraps http(s) favicon URLs so Google can serve the same icon', () => {
    expect(googleS2FaviconUrl(TRUMP)).toBe(
      `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(TRUMP)}`,
    );
  });

  it('skips data, blob, browser-internal, and already-proxied s2 URLs', () => {
    expect(googleS2FaviconUrl('data:image/png;base64,aaa')).toBeNull();
    expect(googleS2FaviconUrl('blob:https://everch.at/abc')).toBeNull();
    expect(googleS2FaviconUrl('chrome://favicon/https://example.com')).toBeNull();
    expect(googleS2FaviconUrl(TRUMP_S2)).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(googleS2FaviconUrl('not a url')).toBeNull();
  });
});

describe('faviconSrcCandidates', () => {
  it('tries Google s2 before a CORP-blocked origin URL', () => {
    expect(faviconSrcCandidates(TRUMP)).toEqual([
      `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(TRUMP)}`,
      TRUMP,
    ]);
  });

  it('does not re-wrap an existing Google s2 URL (avoids default globe)', () => {
    expect(faviconSrcCandidates(TRUMP_S2)).toEqual([TRUMP_S2]);
    expect(isGoogleS2FaviconUrl(TRUMP_S2)).toBe(true);
  });

  it('uses the stored URL alone when Google cannot proxy it', () => {
    expect(faviconSrcCandidates('data:image/png;base64,aaa')).toEqual([
      'data:image/png;base64,aaa',
    ]);
  });

  it('returns nothing when the stored URL is missing', () => {
    expect(faviconSrcCandidates(null)).toEqual([]);
    expect(faviconSrcCandidates('')).toEqual([]);
    expect(faviconSrcCandidates('   ')).toEqual([]);
  });
});

describe('googleS2FaviconForHost', () => {
  it('builds a domain query for bare hosts', () => {
    expect(googleS2FaviconForHost('example.com')).toBe(
      'https://www.google.com/s2/favicons?sz=32&domain=example.com',
    );
    expect(googleS2FaviconForHost('www.nytimes.com')).toBe(
      'https://www.google.com/s2/favicons?sz=32&domain=nytimes.com',
    );
  });

  it('rejects paths and blank values', () => {
    expect(googleS2FaviconForHost('example.com/path')).toBeNull();
    expect(googleS2FaviconForHost('')).toBeNull();
  });
});

describe('resolveFaviconUrl / pageFaviconSrcCandidates', () => {
  it('prefers an http(s) stored favicon', () => {
    expect(
      resolveFaviconUrl({
        faviconUrl: TRUMP,
        url: 'https://www.donaldjtrump.com/',
        canonicalUrl: 'donaldjtrump.com',
      }),
    ).toBe(TRUMP);
  });

  it('falls back to Google s2 for host when favicon is missing', () => {
    expect(
      resolveFaviconUrl({
        faviconUrl: null,
        url: 'https://destockd.com/shop',
        canonicalUrl: 'destockd.com/shop',
      }),
    ).toBe('https://www.google.com/s2/favicons?sz=32&domain=destockd.com');
  });

  it('falls back from canonical host when url is absent', () => {
    expect(
      resolveFaviconUrl({
        faviconUrl: null,
        url: null,
        canonicalUrl: 'donaldjtrump.com/',
      }),
    ).toBe(
      'https://www.google.com/s2/favicons?sz=32&domain=donaldjtrump.com',
    );
  });

  it('ignores non-http tab favicons and derives from host instead', () => {
    expect(
      resolveFaviconUrl({
        faviconUrl: 'chrome-extension://abc/icon.png',
        url: 'https://example.com/a',
        canonicalUrl: 'example.com/a',
      }),
    ).toBe('https://www.google.com/s2/favicons?sz=32&domain=example.com');
  });

  it('builds display candidates with host fallback for marketing cards', () => {
    expect(
      pageFaviconSrcCandidates({
        faviconUrl: null,
        url: null,
        canonicalUrl: 'destockd.com',
      }),
    ).toEqual([
      'https://www.google.com/s2/favicons?sz=32&domain=destockd.com',
    ]);
  });

  it('puts page-host Google s2 before a CDN-hosted stored favicon', () => {
    const cdn =
      'https://res.cloudinary.com/dso0ushec/image/upload/v1/ef-favicon.svg';
    expect(
      pageFaviconSrcCandidates({
        faviconUrl: cdn,
        url: 'https://erikfiala.com/',
        canonicalUrl: 'erikfiala.com/',
      }),
    ).toEqual([
      'https://www.google.com/s2/favicons?sz=32&domain=erikfiala.com',
      `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(cdn)}`,
      cdn,
    ]);
  });
});
