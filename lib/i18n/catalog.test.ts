import { describe, expect, it } from 'vitest';
import { matchSupportedLocale } from './match';

describe('matchSupportedLocale', () => {
  it('maps common tags to catalogs', () => {
    expect(matchSupportedLocale('en-US')).toBe('en');
    expect(matchSupportedLocale('ar-SA')).toBe('ar');
    expect(matchSupportedLocale('zh-Hans-CN')).toBe('zh-CN');
    expect(matchSupportedLocale('zh-TW')).toBe('zh-TW');
    expect(matchSupportedLocale('pt-BR')).toBe('pt-BR');
    expect(matchSupportedLocale('pt-PT')).toBe('pt');
    expect(matchSupportedLocale('nb-NO')).toBe('nb');
  });
});
