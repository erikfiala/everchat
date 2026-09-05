import { describe, expect, it } from 'vitest';
import {
  isRtlLanguageTag,
  primaryLanguageSubtag,
  resolveTextDirection,
  resolveUiLanguage,
} from './locale';

describe('primaryLanguageSubtag', () => {
  it('normalizes underscores and returns the primary tag', () => {
    expect(primaryLanguageSubtag('ar-SA')).toBe('ar');
    expect(primaryLanguageSubtag('he_IL')).toBe('he');
    expect(primaryLanguageSubtag('EN')).toBe('en');
  });
});

describe('isRtlLanguageTag', () => {
  it('treats common RTL primaries as RTL', () => {
    for (const tag of ['ar', 'ar-EG', 'he', 'fa-IR', 'ur-PK', 'yi', 'dv', 'ps', 'ku', 'ckb', 'sd', 'ug']) {
      expect(isRtlLanguageTag(tag)).toBe(true);
    }
  });

  it('keeps LTR languages as LTR', () => {
    for (const tag of ['en', 'en-US', 'fr', 'de-DE', 'ja', 'zh-CN']) {
      expect(isRtlLanguageTag(tag)).toBe(false);
    }
  });
});

describe('resolveTextDirection', () => {
  it('maps tags to dir', () => {
    expect(resolveTextDirection('ar-SA')).toBe('rtl');
    expect(resolveTextDirection('en-US')).toBe('ltr');
  });
});

describe('resolveUiLanguage', () => {
  it('prefers Chrome UI language over navigator', () => {
    expect(
      resolveUiLanguage({
        chromeUiLanguage: 'he',
        languages: ['en-US', 'ar'],
        language: 'en',
      }),
    ).toBe('he');
  });

  it('falls back to navigator.languages then language', () => {
    expect(
      resolveUiLanguage({
        languages: ['fa-IR', 'en'],
        language: 'en',
      }),
    ).toBe('fa-IR');
    expect(resolveUiLanguage({ language: 'ur' })).toBe('ur');
    expect(resolveUiLanguage({})).toBe('en');
  });
});
