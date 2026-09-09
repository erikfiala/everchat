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
  applyThemeToDocument,
  parseStoredSkin,
  SKIN_STORAGE_KEY,
  type StoredSkin,
} from '@/lib/theme';
import { isPreviewMode } from '@/lib/preview/mode';

function readLocalSkin(): StoredSkin | null {
  try {
    const raw = localStorage.getItem(SKIN_STORAGE_KEY);
    if (!raw) return null;
    return parseStoredSkin(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalSkin(skin: StoredSkin | null) {
  try {
    if (!skin) localStorage.removeItem(SKIN_STORAGE_KEY);
    else localStorage.setItem(SKIN_STORAGE_KEY, JSON.stringify(skin));
  } catch {
    /* ignore */
  }
}

interface SkinContextValue {
  skin: StoredSkin | null;
  setSkin: (skin: StoredSkin | null) => void;
  resetSkin: () => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const [skin, setSkinState] = useState<StoredSkin | null>(() =>
    typeof window === 'undefined' ? null : readLocalSkin(),
  );

  useEffect(() => {
    if (isPreviewMode() && !skin) return;
    applyThemeToDocument(skin);
    writeLocalSkin(skin);
  }, [skin]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await browser.storage.local.get(SKIN_STORAGE_KEY);
        const next = parseStoredSkin(stored[SKIN_STORAGE_KEY]);
        if (!cancelled) setSkinState(next);
      } catch {
        /* ignore */
      }
    })();

    const onChanged = (
      changes: Record<string, { newValue?: unknown }>,
      area: string,
    ) => {
      if (area !== 'local' || !changes[SKIN_STORAGE_KEY]) return;
      setSkinState(parseStoredSkin(changes[SKIN_STORAGE_KEY].newValue));
    };
    browser.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      browser.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const setSkin = useCallback((next: StoredSkin | null) => {
    writeLocalSkin(next);
    setSkinState(next);
    void browser.storage.local
      .set({ [SKIN_STORAGE_KEY]: next })
      .catch(() => undefined);
  }, []);

  const resetSkin = useCallback(() => {
    writeLocalSkin(null);
    setSkinState(null);
    void browser.storage.local.remove(SKIN_STORAGE_KEY).catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ skin, setSkin, resetSkin }),
    [skin, setSkin, resetSkin],
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error('useSkin must be used within SkinProvider');
  return ctx;
}
