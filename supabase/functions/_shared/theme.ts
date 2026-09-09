/** Token allowlist + validation for publish-theme. Keep in sync with lib/theme.ts. */

export const THEME_SCHEMA_VERSION = 1;
export const THEME_JSON_MAX_BYTES = 8192;

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
const TOKEN_COUNT = COLOR_TOKENS.length + SIZE_TOKENS.length;

const HEX = /^#([0-9a-fA-F]{6})$/;
const FONT_FAMILY = /^[A-Za-z0-9][A-Za-z0-9 ]{0,59}$/;
const NAME = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,79}$/u;
const AUTHOR = /^[\p{L}\p{N}][\p{L}\p{N} .'_-]{0,39}$/u;
const FORBIDDEN = /url\s*\(|@import|<\/?script|javascript:|data:|expression\s*\(/i;

export const DEFAULT_TOKENS: Record<string, string | number> = {
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

function hasForbidden(value: unknown): boolean {
  return typeof value === 'string' && FORBIDDEN.test(value);
}

function isValidHex(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
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

export function validateTokens(
  raw: unknown,
): Record<string, string | number> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  const keys = Object.keys(input);
  if (keys.length > TOKEN_COUNT) return null;
  for (const key of keys) {
    if (!COLOR_SET.has(key) && !SIZE_BY_NAME.has(key)) return null;
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

export type PublishedTheme = {
  schemaVersion: number;
  name: string;
  author: string;
  fontFamily: string;
  tokens: Record<string, string | number>;
};

export function validateTheme(raw: unknown): PublishedTheme | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const input = raw as Record<string, unknown>;
  if (hasForbidden(JSON.stringify(input))) return null;
  if (input.schemaVersion !== THEME_SCHEMA_VERSION) return null;
  if ('css' in input || 'style' in input || 'url' in input) return null;
  const name = validateLabel(input.name, 'name');
  const author = validateLabel(input.author, 'author');
  if (!name || !author) return null;
  const fontFamily = sanitizeFontFamily(input.fontFamily ?? '');
  if (typeof input.fontFamily === 'string' && input.fontFamily.trim() && !fontFamily) {
    return null;
  }
  const tokens = validateTokens(input.tokens);
  if (!tokens) return null;
  const doc: PublishedTheme = {
    schemaVersion: THEME_SCHEMA_VERSION,
    name,
    author,
    fontFamily,
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
