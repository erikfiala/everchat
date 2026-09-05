/** BCP-47 primary subtags commonly written right-to-left. */
const RTL_PRIMARY = new Set([
  'ar', // Arabic
  'he', // Hebrew
  'fa', // Persian
  'ur', // Urdu
  'yi', // Yiddish
  'dv', // Divehi / Dhivehi
  'ps', // Pashto
  'ku', // Kurdish (Arabic-script varieties)
  'ckb', // Central Kurdish (Sorani)
  'sd', // Sindhi
  'ug', // Uyghur
  'syr', // Syriac
]);

export type TextDirection = 'ltr' | 'rtl';

/** Primary language subtag from a BCP-47 tag (`ar-SA` → `ar`). */
export function primaryLanguageSubtag(tag: string): string {
  const normalized = tag.trim().toLowerCase().replace(/_/g, '-');
  if (!normalized) return '';
  return normalized.split('-').filter(Boolean)[0] ?? '';
}

export function isRtlLanguageTag(tag: string | null | undefined): boolean {
  if (!tag?.trim()) return false;
  return RTL_PRIMARY.has(primaryLanguageSubtag(tag));
}

export function resolveTextDirection(languageTag: string): TextDirection {
  return isRtlLanguageTag(languageTag) ? 'rtl' : 'ltr';
}

/**
 * Prefer Chrome UI language in the extension, else the first navigator language.
 * Defaults to `en` when nothing is available.
 */
export function resolveUiLanguage(options?: {
  chromeUiLanguage?: string | null;
  languages?: readonly string[] | null;
  language?: string | null;
}): string {
  const chromeLang = options?.chromeUiLanguage?.trim();
  if (chromeLang) return chromeLang.replace(/_/g, '-');

  const fromList = options?.languages?.find((l) => l?.trim());
  if (fromList) return fromList.trim().replace(/_/g, '-');

  const single = options?.language?.trim();
  if (single) return single.replace(/_/g, '-');

  return 'en';
}

function readChromeUiLanguage(): string | undefined {
  try {
    const api =
      typeof browser !== 'undefined'
        ? browser.i18n
        : typeof chrome !== 'undefined'
          ? chrome.i18n
          : undefined;
    const lang = api?.getUILanguage?.();
    return lang?.trim() || undefined;
  } catch {
    return undefined;
  }
}

/** Set `document.documentElement` `lang` + `dir` from the UI locale. */
export function applyDocumentLocale(options?: {
  chromeUiLanguage?: string | null;
  languages?: readonly string[] | null;
  language?: string | null;
}): { lang: string; dir: TextDirection } {
  const lang = resolveUiLanguage({
    chromeUiLanguage: options?.chromeUiLanguage ?? readChromeUiLanguage(),
    languages:
      options?.languages ??
      (typeof navigator !== 'undefined' ? navigator.languages : undefined),
    language:
      options?.language ??
      (typeof navigator !== 'undefined' ? navigator.language : undefined),
  });
  const dir = resolveTextDirection(lang);

  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }

  return { lang, dir };
}
