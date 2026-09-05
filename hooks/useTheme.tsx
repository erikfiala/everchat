import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

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
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = resolvePreference(preference);
    setResolved(next);
    applyResolved(next);
    writeLocalPreference(preference);

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
