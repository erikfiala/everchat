import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DARK_COLORS,
  DEFAULT_ICON_PACK,
  DEFAULT_LIGHT_COLORS,
  DEFAULT_THEME_SLUG,
  DEFAULT_TOKENS,
  THEME_VARS_SELECTOR,
  applyThemeVars,
  defaultTheme,
  exportTheme,
  googleFontsHref,
  googleFontsPreviewHref,
  isDefaultThemeSlug,
  isValidFontFamily,
  parseStoredSkinLibrary,
  sanitizeFontFamily,
  sanitizeIconPack,
  storedSkinKey,
  themeVarsCss,
  upsertStoredSkinLibrary,
  validateTheme,
  validateTokens,
  type StoredSkin,
} from './theme';

function flatLegacyTokens() {
  return {
    ...DEFAULT_LIGHT_COLORS,
    '--radius-sm': 6,
    '--radius-md': 8,
    '--radius-lg': 12,
    '--font-size': 14,
    '--font-size-sm': 12,
    '--font-size-lg': 16,
    '--border-width': 1,
    '--space-pad': 12,
    '--space-margin': 8,
    '--space-composer-pad': 12,
  };
}

describe('theme schema', () => {
  it('accepts the default Everchat skin with dual palettes and Lucide icons', () => {
    const theme = validateTheme(defaultTheme());
    expect(theme).not.toBeNull();
    expect(theme?.name).toBe('Default');
    expect(theme?.author).toBe('Everchat');
    expect(theme?.iconPack).toBe('lu');
    expect(theme?.tokens.light['--color-background']).toBe('#fafafa');
    expect(theme?.tokens.dark['--color-background']).toBe('#18181b');
    expect(theme?.tokens.light['--color-success']).toBe('#0f766e');
    expect(theme?.tokens.light['--color-destructive']).toBe('#dc2626');
    expect(theme?.tokens.dark['--color-success']).toBe('#2dd4bf');
    expect(theme?.tokens.dark['--color-destructive']).toBe('#f87171');
    expect(theme?.tokens['--radius-md']).toBe(8);
    expect(isDefaultThemeSlug(DEFAULT_THEME_SLUG)).toBe(true);
    expect(isDefaultThemeSlug('midnight')).toBe(false);
  });

  it('exports dual tokens, iconPack, and no css or url fields', () => {
    const json = exportTheme(defaultTheme());
    expect(json).toEqual({
      schemaVersion: 1,
      name: 'Default',
      author: 'Everchat',
      fontFamily: '',
      iconPack: DEFAULT_ICON_PACK,
      tokens: DEFAULT_TOKENS,
    });
    expect(json.tokens.light).toEqual(DEFAULT_LIGHT_COLORS);
    expect(json.tokens.dark).toEqual(DEFAULT_DARK_COLORS);
    expect(JSON.stringify(json)).not.toMatch(/url\(/i);
    expect(JSON.stringify(json)).not.toMatch(/@import/i);
    expect('css' in json).toBe(false);
  });

  it('normalizes legacy flat tokens onto both palettes', () => {
    const tokens = validateTokens({
      ...flatLegacyTokens(),
      '--color-background': '#112233',
      '--radius-md': 10,
    });
    expect(tokens).not.toBeNull();
    expect(tokens?.light['--color-background']).toBe('#112233');
    expect(tokens?.dark['--color-background']).toBe('#112233');
    expect(tokens?.['--radius-md']).toBe(10);
    expect(
      validateTheme({
        schemaVersion: 1,
        name: 'Legacy',
        author: 'Everchat',
        fontFamily: '',
        tokens: flatLegacyTokens(),
      })?.iconPack,
    ).toBe('lu');
  });

  it('requires both light and dark color palettes in the dual shape', () => {
    expect(
      validateTokens({
        light: { '--color-background': '#112233' },
        '--radius-md': 8,
      }),
    ).toBeNull();
    expect(
      validateTokens({
        dark: { '--color-background': '#112233' },
        '--radius-md': 8,
      }),
    ).toBeNull();
    const dual = validateTokens({
      light: { '--color-background': '#111111' },
      dark: { '--color-background': '#eeeeee' },
      '--radius-md': 4,
    });
    expect(dual?.light['--color-background']).toBe('#111111');
    expect(dual?.dark['--color-background']).toBe('#eeeeee');
    expect(dual?.light['--color-foreground']).toBe(
      DEFAULT_LIGHT_COLORS['--color-foreground'],
    );
    expect(dual?.dark['--color-foreground']).toBe(
      DEFAULT_DARK_COLORS['--color-foreground'],
    );
    expect(dual?.['--radius-md']).toBe(4);
  });

  it('accepts allowlisted icon packs and rejects unknown packs', () => {
    expect(
      validateTheme({
        ...defaultTheme(),
        iconPack: 'tb',
      })?.iconPack,
    ).toBe('tb');
    expect(
      validateTheme({
        ...defaultTheme(),
        iconPack: 'evil',
      }),
    ).toBeNull();
    expect(sanitizeIconPack(undefined)).toBe('lu');
    expect(sanitizeIconPack('pi')).toBe('pi');
  });

  it('applies the palette that matches appearance', () => {
    const attrs: Record<string, string> = {};
    const el = {
      setAttribute(name: string, value: string) {
        attrs[name] = value;
      },
      removeAttribute(name: string) {
        delete attrs[name];
      },
      getAttribute(name: string) {
        return attrs[name] ?? null;
      },
    } as unknown as HTMLElement;
    const theme = defaultTheme();
    expect(themeVarsCss(theme, 'light')).toContain(
      '--color-background:#fafafa',
    );
    expect(themeVarsCss(theme, 'dark')).toContain(
      '--color-background:#18181b',
    );
    expect(themeVarsCss(theme, 'light')).toContain('--radius-md:8px');
    expect(themeVarsCss(theme, 'light')).toContain('--font-size:14px');
    expect(themeVarsCss(theme, 'light')).toContain('--font-size-sm:12px');
    expect(themeVarsCss(theme, 'light')).toContain('--space-pad:12px');
    expect(themeVarsCss(theme, 'light')).toContain('--space-margin:8px');
    expect(themeVarsCss(theme, 'light')).toContain('--space-composer-pad:12px');
    expect(themeVarsCss(theme, 'light')).toContain('--border-width:1px');
    expect(themeVarsCss(theme, 'light')).toContain('--text-sm:14px');
    expect(themeVarsCss(theme, 'light')).toContain('--text-xs:12px');
    expect(themeVarsCss(theme, 'dark').startsWith(`${THEME_VARS_SELECTOR}{`)).toBe(
      true,
    );
    applyThemeVars(el, theme, 'light');
    applyThemeVars(el, theme, 'dark');
    expect(el.getAttribute('data-ec-icon-pack')).toBe('lu');
  });

  it('writes root size tokens and type aliases, not only the color palette', () => {
    const theme = defaultTheme();
    theme.tokens['--font-size'] = 13;
    theme.tokens['--font-size-sm'] = 11;
    theme.tokens['--space-pad'] = 37;
    theme.tokens['--space-margin'] = 20;
    theme.tokens['--space-composer-pad'] = 28;
    theme.tokens['--radius-md'] = 18;
    theme.tokens['--border-width'] = 3;
    const css = themeVarsCss(theme, 'dark');
    expect(css).toContain('--color-background:#18181b');
    expect(css).toContain('--font-size:13px');
    expect(css).toContain('--text-sm:13px');
    expect(css).toContain('--text-xs:11px');
    expect(css).toContain('--space-pad:37px');
    expect(css).toContain('--space-margin:20px');
    expect(css).toContain('--space-composer-pad:28px');
    expect(css).toContain('--radius-md:18px');
    expect(css).toContain('--border-width:3px');
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
      validateTokens({
        light: { '--color-background': 'red' },
        dark: DEFAULT_DARK_COLORS,
      }),
    ).toBeNull();
    expect(
      validateTokens({ ...flatLegacyTokens(), '--color-background': 'red' }),
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

  it('upserts imported skins and skips the default slug', () => {
    const midnight: StoredSkin = {
      ...defaultTheme(),
      name: 'Midnight',
      slug: 'midnight',
    };
    const forest: StoredSkin = {
      ...defaultTheme(),
      name: 'Forest',
      slug: 'forest',
    };
    const official = {
      ...defaultTheme(),
      slug: DEFAULT_THEME_SLUG,
    };
    const library = upsertStoredSkinLibrary(
      upsertStoredSkinLibrary([], midnight),
      forest,
    );
    expect(library.map((item) => item.slug)).toEqual(['forest', 'midnight']);
    expect(upsertStoredSkinLibrary(library, official)).toEqual(library);
    expect(storedSkinKey(midnight)).toBe('slug:midnight');
    expect(parseStoredSkinLibrary([forest, { bad: true }, midnight])).toEqual([
      forest,
      midnight,
    ]);
    expect(parseStoredSkinLibrary(official)).toEqual([]);
  });

  it('builds a 400-only preview href for visible families', () => {
    expect(googleFontsPreviewHref(['Inter', 'Source Serif 4', 'bad/name'])).toBe(
      'https://fonts.googleapis.com/css2?family=Inter:wght@400&family=Source+Serif+4:wght@400&display=swap',
    );
    expect(googleFontsPreviewHref('')).toBeNull();
  });
});
