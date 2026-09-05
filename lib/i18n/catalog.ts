import en from './locales/en.json';
import type { Catalog, LocaleCode, MessageKey } from './languages';
import { isSupportedLocale } from './languages';
import { matchSupportedLocale } from './match';

export { matchSupportedLocale } from './match';

const catalogModules = import.meta.glob<{ default: Catalog }>(
  './locales/*.json',
);

const cache = new Map<LocaleCode, Catalog>();
cache.set('en', en as Catalog);

function localeFileName(code: LocaleCode): string {
  return `./locales/${code}.json`;
}

export async function loadCatalog(code: LocaleCode): Promise<Catalog> {
  const locale = isSupportedLocale(code) ? code : 'en';
  const hit = cache.get(locale);
  if (hit) return hit;

  const loader = catalogModules[localeFileName(locale)];
  if (!loader) {
    return en as Catalog;
  }
  try {
    const mod = await loader();
    const catalog = { ...(en as Catalog), ...mod.default };
    cache.set(locale, catalog);
    return catalog;
  } catch {
    return en as Catalog;
  }
}

export function getCachedCatalog(code: LocaleCode): Catalog {
  return cache.get(code) ?? (en as Catalog);
}

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const v = vars[key];
    return v == null ? '' : String(v);
  });
}

export function translate(
  catalog: Catalog,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  const raw = catalog[key] ?? (en as Catalog)[key] ?? String(key);
  return interpolate(raw, vars);
}

/** Translate if `message` is a known MessageKey; otherwise return as-is. */
export function translateMaybe(
  catalog: Catalog,
  message: string,
  vars?: Record<string, string | number>,
): string {
  if (message in (en as Catalog)) {
    return translate(catalog, message as MessageKey, vars);
  }
  return interpolate(message, vars);
}
