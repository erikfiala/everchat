import { describe, expect, it } from 'vitest';
import { normalizeTranslationLocale } from './translate';

describe('normalizeTranslationLocale', () => {
  it('lowercases and unifies separators', () => {
    expect(normalizeTranslationLocale('zh-CN')).toBe('zh-cn');
    expect(normalizeTranslationLocale('pt_BR')).toBe('pt-br');
    expect(normalizeTranslationLocale(' EN ')).toBe('en');
  });
});
