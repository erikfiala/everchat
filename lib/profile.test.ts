import { describe, expect, it } from 'vitest';
import {
  ABOUT_MAX_LEN,
  normalizeAbout,
  normalizeWebsiteUrl,
  websiteDisplayLabel,
} from './profile';

describe('normalizeAbout', () => {
  it('trims and treats empty as unset', () => {
    expect(normalizeAbout('  ')).toBeNull();
    expect(normalizeAbout(' hello ')).toBe('hello');
  });

  it('caps at ABOUT_MAX_LEN', () => {
    const long = 'a'.repeat(ABOUT_MAX_LEN + 20);
    expect(normalizeAbout(long)?.length).toBe(ABOUT_MAX_LEN);
  });
});

describe('normalizeWebsiteUrl', () => {
  it('clears empty input', () => {
    expect(normalizeWebsiteUrl('')).toBeNull();
    expect(normalizeWebsiteUrl('   ')).toBeNull();
  });

  it('prefers https when the scheme is omitted', () => {
    expect(normalizeWebsiteUrl('example.com')).toBe('https://example.com/');
    expect(normalizeWebsiteUrl('www.example.com/about')).toBe(
      'https://www.example.com/about',
    );
  });

  it('keeps an explicit http or https URL', () => {
    expect(normalizeWebsiteUrl('https://everch.at')).toBe('https://everch.at/');
    expect(normalizeWebsiteUrl('http://example.com/x')).toBe(
      'http://example.com/x',
    );
  });

  it('rejects non-http schemes and credentials', () => {
    expect(() => normalizeWebsiteUrl('javascript:alert(1)')).toThrow(
      'errors.websiteInvalid',
    );
    expect(() => normalizeWebsiteUrl('data:text/html,hi')).toThrow(
      'errors.websiteInvalid',
    );
    expect(() => normalizeWebsiteUrl('https://user:pass@example.com')).toThrow(
      'errors.websiteInvalid',
    );
    expect(() => normalizeWebsiteUrl('not a url')).toThrow(
      'errors.websiteInvalid',
    );
    expect(() => normalizeWebsiteUrl('localhost')).toThrow(
      'errors.websiteInvalid',
    );
  });
});

describe('websiteDisplayLabel', () => {
  it('shows hostname without www', () => {
    expect(websiteDisplayLabel('https://www.example.com/path')).toBe(
      'example.com',
    );
    expect(websiteDisplayLabel('https://everch.at')).toBe('everch.at');
  });

  it('falls back to the stored string', () => {
    expect(websiteDisplayLabel('not-a-url')).toBe('not-a-url');
  });
});
