import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TOKENS,
  defaultTheme,
  exportTheme,
  googleFontsHref,
  googleFontsPreviewHref,
  isValidFontFamily,
  sanitizeFontFamily,
  validateTheme,
  validateTokens,
} from './theme';

describe('theme schema', () => {
  it('accepts the default zinc skin', () => {
    const theme = validateTheme(defaultTheme());
    expect(theme).not.toBeNull();
    expect(theme?.tokens['--color-background']).toBe('#fafafa');
    expect(theme?.tokens['--radius-md']).toBe(8);
  });

  it('exports tokens only — no css or url fields', () => {
    const json = exportTheme(defaultTheme());
    expect(json).toEqual({
      schemaVersion: 1,
      name: 'Zinc',
      author: 'Everchat',
      fontFamily: '',
      tokens: DEFAULT_TOKENS,
    });
    expect(JSON.stringify(json)).not.toMatch(/url\(/i);
    expect(JSON.stringify(json)).not.toMatch(/@import/i);
    expect('css' in json).toBe(false);
  });

  it('rejects url(), @import, and extra keys', () => {
    expect(
      validateTheme({
        ...defaultTheme(),
        name: 'url(https://evil.example)',
      }),
    ).toBeNull();
    expect(
      validateTheme({
        ...defaultTheme(),
        fontFamily: 'Inter; @import',
      }),
    ).toBeNull();
    expect(
      validateTokens({
        ...DEFAULT_TOKENS,
        '--evil': '#000000',
      }),
    ).toBeNull();
    expect(
      validateTheme({
        ...defaultTheme(),
        css: 'body{color:red}',
      }),
    ).toBeNull();
  });

  it('rejects invalid hex and out-of-range sizes', () => {
    expect(
      validateTokens({ ...DEFAULT_TOKENS, '--color-background': 'red' }),
    ).toBeNull();
    expect(
      validateTokens({ ...DEFAULT_TOKENS, '--radius-md': 99 }),
    ).toBeNull();
    expect(
      validateTokens({ ...DEFAULT_TOKENS, '--space-pad': '12px' }),
    ).toBeNull();
  });

  it('allows Literata and Source Serif 4; rejects punctuation', () => {
    expect(isValidFontFamily('Literata')).toBe(true);
    expect(isValidFontFamily('Source Serif 4')).toBe(true);
    expect(isValidFontFamily('')).toBe(true);
    expect(isValidFontFamily('Noto Sans!')).toBe(false);
    expect(isValidFontFamily('../Inter')).toBe(false);
    expect(sanitizeFontFamily('Noto Sans!')).toBe('');
    expect(googleFontsHref('Source Serif 4')).toBe(
      'https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap',
    );
    expect(googleFontsHref('bad/name')).toBeNull();
  });

  it('builds a 400-only preview href for visible families', () => {
    expect(googleFontsPreviewHref(['Inter', 'Source Serif 4', 'bad/name'])).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Source+Serif+4:wght@400&display=swap',
    );
    expect(googleFontsPreviewHref('')).toBeNull();
  });
});
