import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { isPreviewMode } from '@/lib/preview/mode';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'ec-theme';

const LABELS: Record<ThemePreference, string> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

function resolvePreference(pref: ThemePreference): ResolvedTheme {
  if (pref === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }
  return pref;
}

function applyResolved(resolved: ResolvedTheme) {
  document.documentElement.dataset.theme = resolved;
}

function readDocumentTheme(): ResolvedTheme | null {
  const theme = document.documentElement.dataset.theme;
  return theme === 'dark' || theme === 'light' ? theme : null;
}

function isThemePreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Sync mirror for FOUC boot script in sidepanel/index.html */
function readLocalPreference(): ThemePreference {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (isThemePreference(raw)) return raw;
  } catch {
    /* ignore */
  }
  return 'system';
}

function writeLocalPreference(pref: ThemePreference) {
  try {
    localStorage.setItem(STORAGE_KEY, pref);
  } catch {
    /* ignore */
  }
}

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (pref: ThemePreference) => void;
  label: string;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(() =>
    typeof window === 'undefined' ? 'system' : readLocalPreference(),
  );
  const [resolved, setResolved] = useState<ResolvedTheme>(() =>
    typeof window === 'undefined'
      ? 'light'
      : resolvePreference(readLocalPreference()),
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await browser.storage.local.get(STORAGE_KEY);
        const raw = stored[STORAGE_KEY];
        if (isThemePreference(raw)) {
          writeLocalPreference(raw);
          if (!cancelled) setPreferenceState(raw);
        }
      } catch {
        /* ignore */
      }
    })();

    const onChanged = (
      changes: Record<string, { newValue?: unknown }>,
      area: string,
    ) => {
      if (area !== 'local') return;
      const raw = changes[STORAGE_KEY]?.newValue;
      if (isThemePreference(raw)) {
        writeLocalPreference(raw);
        setPreferenceState(raw);
      }
    };
    try {
      browser.storage.onChanged.addListener(onChanged);
    } catch {
      /* ignore */
    }
    return () => {
      cancelled = true;
      try {
        browser.storage.onChanged.removeListener(onChanged);
      } catch {
        /* ignore */
      }
    };
  }, []);

  // Theme preview sets data-theme on the panel iframe; don't clobber it.
  useEffect(() => {
    if (!isPreviewMode()) return;
    const root = document.documentElement;
    const sync = () => {
      const theme = readDocumentTheme();
      if (theme) setResolved(theme);
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const next = resolvePreference(preference);
    writeLocalPreference(preference);

    if (isPreviewMode()) {
      setResolved(readDocumentTheme() ?? next);
      return;
    }

    setResolved(next);
    applyResolved(next);

    if (preference !== 'system') return;

    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      const r = resolvePreference('system');
      setResolved(r);
      applyResolved(r);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preference]);

  const setPreference = useCallback((pref: ThemePreference) => {
    writeLocalPreference(pref);
    setPreferenceState(pref);
    void browser.storage.local.set({ [STORAGE_KEY]: pref }).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({
      preference,
      resolved,
      setPreference,
      label: LABELS[preference],
    }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}

export const THEME_OPTIONS: ThemePreference[] = ['system', 'light', 'dark'];
export const THEME_LABEL = LABELS;
