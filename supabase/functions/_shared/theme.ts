/** Token allowlist + validation for publish-theme. Keep in sync with lib/theme.ts. */

export const THEME_SCHEMA_VERSION = 1;
export const THEME_JSON_MAX_BYTES = 8192;
export const DEFAULT_ICON_PACK = 'lu';
export const ICON_PACK_IDS = ['lu', 'fi', 'hi2', 'tb', 'pi'] as const;

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

const COLOR_SET = new Set<string>(COLOR_TOKENS);
const SIZE_BY_NAME = new Map(SIZE_TOKENS.map((t) => [t.name, t]));
const ICON_PACK_SET = new Set<string>(ICON_PACK_IDS);

const HEX = /^#([0-9a-fA-F]{6})$/;
const FONT_FAMILY = /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/;
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,79}$/u;
const AUTHOR = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,39}$/u;
const FORBIDDEN = /url\s*\(|@import|<\/?script|javascript:|data:|expression\s*\(/i;

export const DEFAULT_LIGHT_COLORS: Record<string, string> = {
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

export const DEFAULT_DARK_COLORS: Record<string, string> = {
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

export const DEFAULT_SIZE_VALUES: Record<string, number> = {
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

export const DEFAULT_TOKENS: Record<string, unknown> = {
  light: { ...DEFAULT_LIGHT_COLORS },
  dark: { ...DEFAULT_DARK_COLORS },
  ...DEFAULT_SIZE_VALUES,
};

function hasForbidden(value: unknown): boolean {
  return typeof value === 'string' && FORBIDDEN.test(value);
}

function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isValidIconPack(value: unknown): value is string {
  return typeof value === 'string' && ICON_PACK_SET.has(value);
}

function sanitizeIconPack(value: unknown): string {
  return isValidIconPack(value) ? value : DEFAULT_ICON_PACK;
}

export function sanitizeFontFamily(value: unknown): string {
  if (typeof value !== 'string') return '';
  const family = value.trim();
  if (!family) return '';
  if (hasForbidden(family) || !FONT_FAMILY.test(family)) return '';
  return family;
}

function validateLabel(value: unknown, kind: 'name' | 'author'): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (hasForbidden(text)) return null;
  if (kind === 'name' && NAME.test(text)) return text;
  if (kind === 'author' && AUTHOR.test(text)) return text;
  return null;
}

function validateColorPalette(
  raw: unknown,
  fallback: Record<string, string>,
): Record<string, string> | null {
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
    palette[key] = value.toLowerCase();
  }
  return palette;
}

function validateSizeValues(
  raw: Record<string, unknown>,
): Record<string, number> | null {
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

export function validateTokens(
  raw: unknown,
): Record<string, unknown> | null {
  if (!isPlainObject(raw)) return null;
  const keys = Object.keys(raw);

  if (isPlainObject(raw.light) || isPlainObject(raw.dark)) {
    if (keys.length > 2 + SIZE_TOKENS.length) return null;
    for (const key of keys) {
      if (key === 'light' || key === 'dark') continue;
      if (!SIZE_BY_NAME.has(key)) return null;
      if (hasForbidden(raw[key])) return null;
    }
    if (!isPlainObject(raw.light) || !isPlainObject(raw.dark)) return null;
    const light = validateColorPalette(raw.light, DEFAULT_LIGHT_COLORS);
    const dark = validateColorPalette(raw.dark, DEFAULT_DARK_COLORS);
    const sizes = validateSizeValues(raw);
    if (!light || !dark || !sizes) return null;
    return { light, dark, ...sizes };
  }

  if (keys.length > COLOR_TOKENS.length + SIZE_TOKENS.length) return null;
  for (const key of keys) {
    if (!COLOR_SET.has(key) && !SIZE_BY_NAME.has(key)) return null;
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

export type PublishedTheme = {
  schemaVersion: number;
  name: string;
  author: string;
  fontFamily: string;
  iconPack: string;
  tokens: Record<string, unknown>;
};

export function validateTheme(raw: unknown): PublishedTheme | null {
  if (!isPlainObject(raw)) return null;
  if (hasForbidden(JSON.stringify(raw))) return null;
  if (raw.schemaVersion !== THEME_SCHEMA_VERSION) return null;
  if ('css' in raw || 'style' in raw || 'url' in raw) return null;
  const name = validateLabel(raw.name, 'name');
  const author = validateLabel(raw.author, 'author');
  if (!name || !author) return null;
  const fontFamily = sanitizeFontFamily(raw.fontFamily ?? '');
  if (typeof raw.fontFamily === 'string' && raw.fontFamily.trim() && !fontFamily) {
    return null;
  }
  if (raw.iconPack != null && !isValidIconPack(raw.iconPack)) return null;
  const tokens = validateTokens(raw.tokens);
  if (!tokens) return null;
  const doc: PublishedTheme = {
    schemaVersion: THEME_SCHEMA_VERSION,
    name,
    author,
    fontFamily,
    iconPack: sanitizeIconPack(raw.iconPack),
    tokens,
  };
  if (new TextEncoder().encode(JSON.stringify(doc)).length > THEME_JSON_MAX_BYTES) {
    return null;
  }
  return doc;
}

export function slugify(name: string): string {
  const base = name
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 32);
  return base || 'theme';
}
