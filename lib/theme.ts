/** Official Everchat skin schema: JSON tokens only. No user CSS. */

import {
  DEFAULT_ICON_PACK,
  isValidIconPack,
  sanitizeIconPack,
  type IconPackId,
} from '@/lib/icons';

export { DEFAULT_ICON_PACK, isValidIconPack, sanitizeIconPack };
export type { IconPackId };

export const THEME_SCHEMA_VERSION = 1;
export const SKIN_STORAGE_KEY = 'ec-skin';
export const SKIN_LIBRARY_KEY = 'ec-skins';
export const SKIN_LIBRARY_MAX = 40;
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
  '--color-success',
  '--color-destructive',
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

export type ThemeAppearance = 'light' | 'dark';

export type ColorPalette = {
  [K in ColorToken]: string;
};

export type SizeValues = {
  [K in SizeToken]: number;
};

/** Dual palettes + shared size/radius tokens. */
export type ThemeTokens = {
  light: ColorPalette;
  dark: ColorPalette;
} & SizeValues;

export type ThemeDocument = {
  schemaVersion: typeof THEME_SCHEMA_VERSION;
  name: string;
  author: string;
  fontFamily: string;
  iconPack: IconPackId;
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

export const DEFAULT_LIGHT_COLORS: ColorPalette = {
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
  '--color-success': '#0f766e',
  '--color-destructive': '#dc2626',
  '--color-score-pos': '#0f766e',
  '--color-score-neg': '#dc2626',
  '--color-ring': '#a1a1aa',
  '--color-hover-background': '#f4f4f5',
  '--color-hover-border': '#d4d4d8',
  '--color-hover-foreground': '#18181b',
};

export const DEFAULT_DARK_COLORS: ColorPalette = {
  '--color-background': '#18181b',
  '--color-foreground': '#fafafa',
  '--color-muted': '#27272a',
  '--color-muted-foreground': '#a1a1aa',
  '--color-border': '#3f3f46',
  '--color-card': '#27272a',
  '--color-primary': '#f4f4f5',
  '--color-primary-foreground': '#18181b',
  '--color-accent': '#3f3f46',
  '--color-anonymous-avatar': '#71717a',
  '--color-success': '#2dd4bf',
  '--color-destructive': '#f87171',
  '--color-score-pos': '#2dd4bf',
  '--color-score-neg': '#f87171',
  '--color-ring': '#71717a',
  '--color-hover-background': '#3f3f46',
  '--color-hover-border': '#52525b',
  '--color-hover-foreground': '#fafafa',
};

export const DEFAULT_SIZE_VALUES: SizeValues = {
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

export const DEFAULT_TOKENS: ThemeTokens = {
  light: { ...DEFAULT_LIGHT_COLORS },
  dark: { ...DEFAULT_DARK_COLORS },
  ...DEFAULT_SIZE_VALUES,
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isDualTokenShape(raw: Record<string, unknown>): boolean {
  return isPlainObject(raw.light) || isPlainObject(raw.dark);
}

function validateColorPalette(
  raw: unknown,
  fallback: ColorPalette,
): ColorPalette | null {
  if (!isPlainObject(raw)) return null;
  const keys = Object.keys(raw);
  if (keys.length > COLOR_TOKENS.length) return null;
  const palette = { ...fallback };
  for (const key of keys) {
    if (!COLOR_SET.has(key)) return null;
    if (hasForbidden(raw[key])) return null;
    const value = raw[key];
    if (value == null) continue;
    if (!isValidHex(value)) return null;
    palette[key as ColorToken] = value.toLowerCase();
  }
  return palette;
}

function validateSizeValues(raw: Record<string, unknown>): SizeValues | null {
  const sizes = { ...DEFAULT_SIZE_VALUES };
  for (const spec of SIZE_TOKENS) {
    const value = raw[spec.name];
    if (value == null) continue;
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < spec.min || value > spec.max) return null;
    sizes[spec.name] = Math.round(value);
  }
  return sizes;
}

function cloneTokens(tokens: ThemeTokens): ThemeTokens {
  return {
    light: { ...tokens.light },
    dark: { ...tokens.dark },
    ...SIZE_TOKENS.reduce((acc, spec) => {
      acc[spec.name] = tokens[spec.name];
      return acc;
    }, {} as SizeValues),
  };
}

export function validateTokens(raw: unknown): ThemeTokens | null {
  if (!isPlainObject(raw)) return null;
  const keys = Object.keys(raw);

  if (isDualTokenShape(raw)) {
    const allowed = 2 + SIZE_TOKENS.length;
    if (keys.length > allowed) return null;
    for (const key of keys) {
      if (key === 'light' || key === 'dark') continue;
      if (!SIZE_BY_NAME.has(key as SizeToken)) return null;
      if (hasForbidden(raw[key])) return null;
    }
    if (!isPlainObject(raw.light) || !isPlainObject(raw.dark)) return null;
    const light = validateColorPalette(raw.light, DEFAULT_LIGHT_COLORS);
    const dark = validateColorPalette(raw.dark, DEFAULT_DARK_COLORS);
    const sizes = validateSizeValues(raw);
    if (!light || !dark || !sizes) return null;
    return { light, dark, ...sizes };
  }

  if (keys.length > TOKEN_NAMES.length) return null;
  for (const key of keys) {
    if (!COLOR_SET.has(key) && !SIZE_BY_NAME.has(key as SizeToken)) {
      return null;
    }
    if (hasForbidden(raw[key])) return null;
  }

  const palette = { ...DEFAULT_LIGHT_COLORS };
  for (const name of COLOR_TOKENS) {
    const value = raw[name];
    if (value == null) continue;
    if (!isValidHex(value)) return null;
    palette[name] = value.toLowerCase();
  }
  const sizes = validateSizeValues(raw);
  if (!sizes) return null;
  return { light: { ...palette }, dark: { ...palette }, ...sizes };
}

export function validateTheme(raw: unknown): ThemeDocument | null {
  if (!isPlainObject(raw)) return null;
  if (hasForbidden(JSON.stringify(raw))) return null;
  if (raw.schemaVersion !== THEME_SCHEMA_VERSION) return null;
  if ('css' in raw || 'style' in raw || 'url' in raw) return null;
  const name = validateLabel(raw.name, 'name');
  const author = validateLabel(raw.author, 'author');
  if (!name || !author) return null;
  if (!isValidFontFamily(raw.fontFamily)) return null;
  if (raw.iconPack != null && !isValidIconPack(raw.iconPack)) return null;
  const tokens = validateTokens(raw.tokens);
  if (!tokens) return null;
  const doc: ThemeDocument = {
    schemaVersion: THEME_SCHEMA_VERSION,
    name,
    author,
    fontFamily: sanitizeFontFamily(raw.fontFamily),
    iconPack: sanitizeIconPack(raw.iconPack),
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
    iconPack: DEFAULT_ICON_PACK,
    tokens: cloneTokens(DEFAULT_TOKENS),
  };
}

export function exportTheme(theme: ThemeDocument): ThemeDocument {
  return {
    schemaVersion: THEME_SCHEMA_VERSION,
    name: theme.name,
    author: theme.author,
    fontFamily: theme.fontFamily,
    iconPack: sanitizeIconPack(theme.iconPack),
    tokens: cloneTokens(theme.tokens),
  };
}

const FONT_LINK_ID = 'ec-skin-font';
const SKIN_STYLE_ID = 'ec-skin-vars';
const SKIN_SHEET_KEY = '__ecSkinSheet';

type DocumentWithSkinSheet = Document & {
  [SKIN_SHEET_KEY]?: CSSStyleSheet;
};

/** Tailwind utilities the panel actually paints (`text-sm`, `text-xs`, …). */
function sizeAliasDecls(tokens: ThemeTokens): string[] {
  const decls: string[] = [];
  const font = tokens['--font-size'];
  const fontSm = tokens['--font-size-sm'];
  const fontLg = tokens['--font-size-lg'];
  if (typeof font === 'number' && Number.isFinite(font)) {
    // Chat chrome is `text-sm`; Font size must move that, not only `body`.
    decls.push(`--text-base:${font}px`);
    decls.push(`--text-sm:${font}px`);
  }
  if (typeof fontSm === 'number' && Number.isFinite(fontSm)) {
    decls.push(`--text-xs:${fontSm}px`);
  }
  if (typeof fontLg === 'number' && Number.isFinite(fontLg)) {
    decls.push(`--text-lg:${fontLg}px`);
  }
  return decls;
}

function sizeTokenDecls(tokens: ThemeTokens): string[] {
  const decls: string[] = [];
  for (const spec of SIZE_TOKENS) {
    const value = tokens[spec.name];
    if (typeof value !== 'number' || !Number.isFinite(value)) continue;
    decls.push(`${spec.name}:${value}px`);
  }
  return decls.concat(sizeAliasDecls(tokens));
}

/** `:root{…}` rule for a skin. Used instead of `element.style` (CSP style-src). */
export function themeVarsCss(
  theme: ThemeDocument,
  appearance: ThemeAppearance,
): string {
  const colors = theme.tokens[appearance] ?? theme.tokens.light;
  const decls: string[] = [];
  for (const name of COLOR_TOKENS) {
    if (colors[name]) decls.push(`${name}:${colors[name]}`);
  }
  decls.push(...sizeTokenDecls(theme.tokens));
  const family = sanitizeFontFamily(theme.fontFamily);
  if (family) {
    decls.push(`--font-sans:"${family}", ui-sans-serif, system-ui, sans-serif`);
  }
  return `:root{${decls.join(';')}}`;
}

function applyThemeSheet(doc: Document | null, css: string): void {
  if (!doc) return;
  try {
    const view = doc.defaultView;
    const host = doc as DocumentWithSkinSheet;
    if (
      view &&
      typeof view.CSSStyleSheet === 'function' &&
      'adoptedStyleSheets' in doc
    ) {
      let sheet = host[SKIN_SHEET_KEY];
      if (!sheet) {
        sheet = new view.CSSStyleSheet();
        host[SKIN_SHEET_KEY] = sheet;
        doc.adoptedStyleSheets = [...doc.adoptedStyleSheets, sheet];
      }
      sheet.replaceSync(css);
      return;
    }
  } catch {
    /* fall through to a <style> tag */
  }
  let style = doc.getElementById(SKIN_STYLE_ID);
  if (!css) {
    style?.remove();
    return;
  }
  if (!(style instanceof HTMLStyleElement)) {
    style = doc.createElement('style');
    style.id = SKIN_STYLE_ID;
    doc.head.appendChild(style);
  }
  style.textContent = css;
}

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

export function resolveThemeAppearance(
  doc: Document = document,
): ThemeAppearance {
  return doc.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

export function applyThemeVars(
  el: HTMLElement,
  theme: ThemeDocument | null,
  appearance?: ThemeAppearance,
): void {
  const doc =
    el.ownerDocument ??
    (typeof document !== 'undefined' ? document : null);
  el.removeAttribute('data-ec-skin');
  el.removeAttribute('data-ec-icon-pack');
  // Drop leftover inline token mutations from older builds (CSP style-src).
  el.removeAttribute('style');
  if (!theme) {
    applyThemeSheet(doc, '');
    return;
  }

  const mode = appearance ?? resolveThemeAppearance(doc ?? document);
  el.setAttribute('data-ec-skin', theme.name);
  el.setAttribute('data-ec-icon-pack', sanitizeIconPack(theme.iconPack));
  applyThemeSheet(doc, themeVarsCss(theme, mode));
}

export function applyThemeToDocument(
  theme: ThemeDocument | null,
  doc: Document = document,
  appearance?: ThemeAppearance,
): void {
  applyThemeVars(doc.documentElement, theme, appearance);
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

export function storedSkinKey(skin: StoredSkin): string {
  if (skin.slug) return `slug:${skin.slug}`;
  if (skin.id) return `id:${skin.id}`;
  return `name:${skin.name}`;
}

export function parseStoredSkinLibrary(raw: unknown): StoredSkin[] {
  if (!Array.isArray(raw)) return [];
  const out: StoredSkin[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    const skin = parseStoredSkin(item);
    if (!skin || isDefaultThemeSlug(skin.slug)) continue;
    const key = storedSkinKey(skin);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skin);
    if (out.length >= SKIN_LIBRARY_MAX) break;
  }
  return out;
}

export function upsertStoredSkinLibrary(
  library: StoredSkin[],
  skin: StoredSkin,
): StoredSkin[] {
  if (isDefaultThemeSlug(skin.slug)) return library;
  const key = storedSkinKey(skin);
  return [skin, ...library.filter((item) => storedSkinKey(item) !== key)].slice(
    0,
    SKIN_LIBRARY_MAX,
  );
}
