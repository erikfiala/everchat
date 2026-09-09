/** Official Everchat skin schema: JSON tokens only. No user CSS. */

export const THEME_SCHEMA_VERSION = 1;
export const SKIN_STORAGE_KEY = 'ec-skin';
export const THEME_JSON_MAX_BYTES = 8192;
export const DEFAULT_THEME_SLUG = 'everchat';
export const DEFAULT_THEME_ID = 'e0e0e0e0-0000-4000-8000-000000000001';

export const COLOR_TOKENS = [
  '--color-background',
  '--color-foreground',
  '--color-muted',
  '--color-muted-foreground',
  '--color-border',
  '--color-card',
  '--color-primary',
  '--color-primary-foreground',
  '--color-accent',
  '--color-anonymous-avatar',
  '--color-destructive',
  '--color-success',
  '--color-score-pos',
  '--color-score-neg',
  '--color-ring',
  '--color-hover-background',
  '--color-hover-border',
  '--color-hover-foreground',
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export const SIZE_TOKENS = [
  { name: '--radius-sm', min: 0, max: 32, fallback: 6 },
  { name: '--radius-md', min: 0, max: 32, fallback: 8 },
  { name: '--radius-lg', min: 0, max: 32, fallback: 12 },
  { name: '--font-size', min: 10, max: 24, fallback: 14 },
  { name: '--font-size-sm', min: 10, max: 22, fallback: 12 },
  { name: '--font-size-lg', min: 12, max: 28, fallback: 16 },
  { name: '--border-width', min: 0, max: 8, fallback: 1 },
  { name: '--space-pad', min: 0, max: 48, fallback: 12 },
  { name: '--space-margin', min: 0, max: 48, fallback: 8 },
  { name: '--space-composer-pad', min: 0, max: 48, fallback: 12 },
] as const;

export type SizeToken = (typeof SIZE_TOKENS)[number]['name'];

export const TOKEN_NAMES = [
  ...COLOR_TOKENS,
  ...SIZE_TOKENS.map((t) => t.name),
] as const;

export type TokenName = (typeof TOKEN_NAMES)[number];

export type ThemeTokens = {
  [K in ColorToken]: string;
} & {
  [K in SizeToken]: number;
};

export type ThemeDocument = {
  schemaVersion: typeof THEME_SCHEMA_VERSION;
  name: string;
  author: string;
  fontFamily: string;
  tokens: ThemeTokens;
};

export type StoredSkin = ThemeDocument & {
  id?: string;
  slug?: string;
};

const COLOR_SET = new Set<string>(COLOR_TOKENS);
const SIZE_BY_NAME = new Map(SIZE_TOKENS.map((t) => [t.name, t]));

const HEX = /^#([0-9a-fA-F]{6})$/;
const FONT_FAMILY = /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/;
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,79}$/u;
const AUTHOR = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,39}$/u;
const SLUG = /^[a-z0-9][a-z0-9-]{1,46}[a-z0-9]$/;
const FORBIDDEN = /url\s*\(|@import|<\/?script|javascript:|data:|expression\s*\(/i;

export const DEFAULT_TOKENS: ThemeTokens = {
  '--color-background': '#fafafa',
  '--color-foreground': '#18181b',
  '--color-muted': '#f4f4f5',
  '--color-muted-foreground': '#71717a',
  '--color-border': '#e4e4e7',
  '--color-card': '#ffffff',
  '--color-primary': '#27272a',
  '--color-primary-foreground': '#fafafa',
  '--color-accent': '#f4f4f5',
  '--color-anonymous-avatar': '#e4e4e7',
  '--color-destructive': '#dc2626',
  '--color-success': '#0f766e',
  '--color-score-pos': '#0f766e',
  '--color-score-neg': '#dc2626',
  '--color-ring': '#a1a1aa',
  '--color-hover-background': '#f4f4f5',
  '--color-hover-border': '#d4d4d8',
  '--color-hover-foreground': '#18181b',
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

export const FONT_SUGGESTIONS = [
  'Inter',
  'Literata',
  'Source Serif 4',
  'Merriweather',
  'Lora',
  'Source Sans 3',
  'IBM Plex Sans',
  'IBM Plex Serif',
  'DM Sans',
  'Nunito',
  'Libre Baskerville',
  'Newsreader',
  'Fraunces',
  'Atkinson Hyperlegible',
  'Karla',
  'Manrope',
] as const;

export function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function isValidFontFamily(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const family = value.trim();
  if (!family) return true;
  if (FORBIDDEN.test(family)) return false;
  return FONT_FAMILY.test(family);
}

export function sanitizeFontFamily(value: unknown): string {
  if (typeof value !== 'string') return '';
  const family = value.trim();
  return isValidFontFamily(family) ? family : '';
}

export function googleFontsHref(family: string): string | null {
  const safe = sanitizeFontFamily(family);
  if (!safe) return null;
  const encoded = safe.replace(/ /g, '+');
  return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap`;
}

/** 400-only CSS for picker previews. Pass the families currently on screen. */
export function googleFontsPreviewHref(
  families: string | readonly string[],
): string | null {
  const list = typeof families === 'string' ? [families] : families;
  const safe: string[] = [];
  const seen = new Set<string>();
  for (const family of list) {
    const name = sanitizeFontFamily(family);
    if (!name || seen.has(name)) continue;
    seen.add(name);
    safe.push(name);
  }
  if (!safe.length) return null;
  return (
    'https://fonts.googleapis.com/css2?' +
    safe.map((name) => `family=${name.replace(/ /g, '+')}:wght@400`).join('&') +
    '&display=swap'
  );
}

function hasForbidden(value: unknown): boolean {
  if (typeof value === 'string') return FORBIDDEN.test(value);
  return false;
}

export function validateLabel(
  value: unknown,
  kind: 'name' | 'author',
): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (hasForbidden(text)) return null;
  if (kind === 'name' && NAME.test(text)) return text;
  if (kind === 'author' && AUTHOR.test(text)) return text;
  return null;
}

export function isValidSlug(value: unknown): value is string {
  return typeof value === 'string' && SLUG.test(value);
}

export function validateTokens(raw: unknown): ThemeTokens | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.length > TOKEN_NAMES.length) return null;
  for (const key of keys) {
    if (!COLOR_SET.has(key) && !SIZE_BY_NAME.has(key as SizeToken)) {
      return null;
    }
    if (hasForbidden(input[key])) return null;
  }

  const tokens = { ...DEFAULT_TOKENS };
  for (const name of COLOR_TOKENS) {
    const value = input[name];
    if (value == null) continue;
    if (!isValidHex(value)) return null;
    tokens[name] = value.toLowerCase();
  }
  for (const spec of SIZE_TOKENS) {
    const value = input[spec.name];
    if (value == null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < spec.min || value > spec.max) return null;
    tokens[spec.name] = Math.round(value);
  }
  return tokens;
}

export function validateTheme(raw: unknown): ThemeDocument | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (hasForbidden(JSON.stringify(input))) return null;
  if (input.schemaVersion !== THEME_SCHEMA_VERSION) return null;
  if ('css' in input || 'style' in input || 'url' in input) return null;
  const name = validateLabel(input.name, 'name');
  const author = validateLabel(input.author, 'author');
  if (!name || !author) return null;
  if (!isValidFontFamily(input.fontFamily)) return null;
  const tokens = validateTokens(input.tokens);
  if (!tokens) return null;
  const doc: ThemeDocument = {
    schemaVersion: THEME_SCHEMA_VERSION,
    name,
    author,
    fontFamily: sanitizeFontFamily(input.fontFamily),
    tokens,
  };
  if (new TextEncoder().encode(JSON.stringify(doc)).length > THEME_JSON_MAX_BYTES) {
    return null;
  }
  return doc;
}

export function isDefaultThemeSlug(value: unknown): boolean {
  return value === DEFAULT_THEME_SLUG;
}

export function defaultTheme(): ThemeDocument {
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    name: 'Default',
    author: 'Everchat',
    fontFamily: '',
    tokens: { ...DEFAULT_TOKENS },
  };
}

export function exportTheme(theme: ThemeDocument): ThemeDocument {
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    name: theme.name,
    author: theme.author,
    fontFamily: theme.fontFamily,
    tokens: { ...theme.tokens },
  };
}

const FONT_LINK_ID = 'ec-skin-font';

export function loadGoogleFont(doc: Document, family: string): void {
  const href = googleFontsHref(family);
  const existing = doc.getElementById(FONT_LINK_ID);
  if (!href) {
    existing?.remove();
    return;
  }
  if (existing instanceof HTMLLinkElement && existing.href === href) return;
  existing?.remove();
  const link = doc.createElement('link');
  link.id = FONT_LINK_ID;
  link.rel = 'stylesheet';
  link.href = href;
  link.referrerPolicy = 'no-referrer';
  doc.head.appendChild(link);
}

export function applyThemeVars(
  el: HTMLElement,
  theme: ThemeDocument | null,
): void {
  for (const name of TOKEN_NAMES) {
    el.style.removeProperty(name);
  }
  el.style.removeProperty('--font-sans');
  el.removeAttribute('data-ec-skin');
  if (!theme) return;

  el.setAttribute('data-ec-skin', theme.name);
  for (const name of COLOR_TOKENS) {
    el.style.setProperty(name, theme.tokens[name]);
  }
  for (const spec of SIZE_TOKENS) {
    el.style.setProperty(spec.name, `${theme.tokens[spec.name]}px`);
  }
  const family = sanitizeFontFamily(theme.fontFamily);
  if (family) {
    el.style.setProperty(
      '--font-sans',
      `"${family}", ui-sans-serif, system-ui, sans-serif`,
    );
  }
}

export function applyThemeToDocument(
  theme: ThemeDocument | null,
  doc: Document = document,
): void {
  applyThemeVars(doc.documentElement, theme);
  loadGoogleFont(doc, theme?.fontFamily ?? '');
}

export function parseStoredSkin(raw: unknown): StoredSkin | null {
  const theme = validateTheme(raw);
  if (!theme) return null;
  const input = raw as Record<string, unknown>;
  const stored: StoredSkin = theme;
  if (typeof input.id === 'string' && input.id.length <= 80) {
    stored.id = input.id;
  }
  if (isValidSlug(input.slug)) stored.slug = input.slug;
  return stored;
}
