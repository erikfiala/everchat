import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  STORAGE_KEY,
  LANGUAGES,
  getCachedCatalog,
  isLocalePreference,
  loadCatalog,
  matchSupportedLocale,
  setTranslator,
  translate,
  translateMaybe,
  type Catalog,
  type LocaleCode,
  type LocalePreference,
  type MessageKey,
} from '@/lib/i18n';
import {
  applyDocumentLocale,
  resolveTextDirection,
  resolveUiLanguage,
  type TextDirection,
} from '@/lib/locale';

function readChromeUiLanguage(): string | undefined {
  try {
    const api =
      typeof browser !== 'undefined'
        ? browser.i18n
        : typeof chrome !== 'undefined'
          ? chrome.i18n
          : undefined;
    return api?.getUILanguage?.()?.trim() || undefined;
  } catch {
    return undefined;
  }
}

function detectSystemLocale(): LocaleCode {
  return matchSupportedLocale(
    resolveUiLanguage({
      chromeUiLanguage: readChromeUiLanguage(),
      languages:
        typeof navigator !== 'undefined' ? navigator.languages : undefined,
      language: typeof navigator !== 'undefined' ? navigator.language : undefined,
    }),
  );
}

function readLocalPreference(): LocalePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isLocalePreference(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'system';
}

function writeLocalPreference(pref: LocalePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

function resolveLocale(pref: LocalePreference): LocaleCode {
  return pref === 'system' ? detectSystemLocale() : pref;
}

function applyHtml(locale: LocaleCode) {
  applyDocumentLocale({
    chromeUiLanguage: locale,
    languages: [locale],
    language: locale,
  });
}

type TFunction = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

interface LocaleContextValue {
  preference: LocalePreference;
  locale: LocaleCode;
  dir: TextDirection;
  catalog: Catalog;
  setPreference: (pref: LocalePreference) => void;
  t: TFunction;
  /** Translate Error.message when it is an i18n key. */
  tError: (error: unknown, fallbackKey?: MessageKey) => string;
  languages: typeof LANGUAGES;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<LocalePreference>(() =>
    typeof window === 'undefined' ? 'system' : readLocalPreference(),
  );
  const [locale, setLocale] = useState<LocaleCode>(() =>
    typeof window === 'undefined' ? 'en' : resolveLocale(readLocalPreference()),
  );
  const [catalog, setCatalog] = useState<Catalog>(() =>
    getCachedCatalog(
      typeof window === 'undefined' ? 'en' : resolveLocale(readLocalPreference()),
    ),
  );

  // Hydrate from chrome.storage (authoritative across extension pages)
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await browser.storage.local.get(STORAGE_KEY);
        const raw = stored[STORAGE_KEY];
        if (isLocalePreference(raw)) {
          writeLocalPreference(raw);
          if (!cancelled) setPreferenceState(raw);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = resolveLocale(preference);
    setLocale(next);
    applyHtml(next);
    writeLocalPreference(preference);

    let cancelled = false;
    void loadCatalog(next).then((cat) => {
      if (!cancelled) setCatalog(cat);
    });

    if (preference !== 'system') {
      return () => {
        cancelled = true;
      };
    }

    const onLang = () => {
      const detected = detectSystemLocale();
      setLocale(detected);
      applyHtml(detected);
      void loadCatalog(detected).then((cat) => {
        if (!cancelled) setCatalog(cat);
      });
    };
    window.addEventListener('languagechange', onLang);
    return () => {
      cancelled = true;
      window.removeEventListener('languagechange', onLang);
    };
  }, [preference]);

  const setPreference = useCallback((pref: LocalePreference) => {
    writeLocalPreference(pref);
    setPreferenceState(pref);
    void browser.storage.local.set({ [STORAGE_KEY]: pref }).catch(() => undefined);
  }, []);

  const t = useCallback<TFunction>(
    (key, vars) => translate(catalog, key, vars),
    [catalog],
  );

  useEffect(() => {
    setTranslator(t);
  }, [t]);

  const tError = useCallback(
    (error: unknown, fallbackKey: MessageKey = 'errors.generic') => {
      const msg = error instanceof Error ? error.message : String(error ?? '');
      const vars =
        error instanceof Error
          ? (
              error as Error & {
                i18nVars?: Record<string, string | number>;
              }
            ).i18nVars
          : undefined;
      return translateMaybe(catalog, msg, vars) || t(fallbackKey);
    },
    [catalog, t],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      preference,
      locale,
      dir: resolveTextDirection(locale),
      catalog,
      setPreference,
      t,
      tError,
      languages: LANGUAGES,
    }),
    [preference, locale, catalog, setPreference, t, tError],
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used within LocaleProvider');
  return ctx;
}
