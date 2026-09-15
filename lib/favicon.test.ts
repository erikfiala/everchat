import { describe, expect, it } from 'vitest';
import { faviconSrcCandidates, googleS2FaviconForHost, googleS2FaviconUrl } from './favicon';

const TRUMP =
  'https://www.donaldjtrump.com/assets/images/favicon/favicon.ico';

describe('googleS2FaviconUrl', () => {
  it('wraps http(s) favicon URLs so Google can serve the same icon', () => {
    expect(googleS2FaviconUrl(TRUMP)).toBe(
      `https://www.google.com/s2/favicons?sz=32&domain_url=${encodeURIComponent(TRUMP)}`,
    );
  });

  it('skips data, blob, and browser-internal URLs', () => {
    expect(googleS2FaviconUrl('data:image/png;base64,aaa')).toBeNull();
    expect(googleS2FaviconUrl('blob:https://everch.at/abc')).toBeNull();
    expect(googleS2FaviconUrl('chrome://favicon/https://example.com')).toBeNull();
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
