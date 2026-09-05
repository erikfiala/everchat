import en from './locales/en.json';
import {
  getCachedCatalog,
  loadCatalog,
  matchSupportedLocale,
  translate,
} from './catalog';
import {
  STORAGE_KEY,
  isLocalePreference,
  type Catalog,
  type MessageKey,
} from './languages';
import { resolveUiLanguage } from '@/lib/locale';

export type Translator = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

let translator: Translator = (key, vars) =>
  translate(getCachedCatalog('en'), key, vars);

export function setTranslator(fn: Translator) {
  translator = fn;
}

export function getT(): Translator {
  return translator;
}

/** Load preferred catalog into getT() (for background / non-React callers). */
export async function hydrateTranslatorFromStorage(): Promise<void> {
  try {
    const stored = await browser.storage.local.get(STORAGE_KEY);
    const raw = stored[STORAGE_KEY];
    const pref = isLocalePreference(raw) ? raw : 'system';
    const tag =
      pref === 'system'
        ? resolveUiLanguage({
            chromeUiLanguage: browser.i18n?.getUILanguage?.(),
          })
        : pref;
    const locale = matchSupportedLocale(tag);
    const catalog = await loadCatalog(locale);
    setTranslator((key, vars) => translate(catalog, key, vars));
  } catch {
    /* keep current translator */
  }
}

function i18nVarsOf(
  error: unknown,
): Record<string, string | number> | undefined {
  if (!(error instanceof Error)) return undefined;
  const vars = (error as Error & { i18nVars?: unknown }).i18nVars;
  if (vars && typeof vars === 'object') {
    return vars as Record<string, string | number>;
  }
  return undefined;
}

/** Translate Error.message when it is an i18n key (supports `i18nVars`). */
export function tError(
  error: unknown,
  fallbackKey: MessageKey = 'errors.generic',
): string {
  const msg = error instanceof Error ? error.message : String(error ?? '');
  const vars = i18nVarsOf(error);
  if (msg in (en as Catalog)) {
    return translator(msg as MessageKey, vars);
  }
  if (msg) return msg;
  return translator(fallbackKey);
}
