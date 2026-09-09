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
  isDefaultThemeSlug,
  parseStoredSkin,
  parseStoredSkinLibrary,
  SKIN_LIBRARY_KEY,
  SKIN_STORAGE_KEY,
  storedSkinKey,
  upsertStoredSkinLibrary,
  type StoredSkin,
} from '@/lib/theme';
import { isPreviewMode } from '@/lib/preview/mode';
import { useTheme } from '@/hooks/useTheme';

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

function readLocalLibrary(): StoredSkin[] {
  try {
    const raw = localStorage.getItem(SKIN_LIBRARY_KEY);
    if (!raw) return [];
    return parseStoredSkinLibrary(JSON.parse(raw));
  } catch {
    return [];
  }
}

function writeLocalLibrary(library: StoredSkin[]) {
  try {
    if (!library.length) localStorage.removeItem(SKIN_LIBRARY_KEY);
    else localStorage.setItem(SKIN_LIBRARY_KEY, JSON.stringify(library));
  } catch {
    /* ignore */
  }
}

function seedLibrary(library: StoredSkin[], skin: StoredSkin | null): StoredSkin[] {
  if (!skin || isDefaultThemeSlug(skin.slug)) return library;
  if (library.some((item) => storedSkinKey(item) === storedSkinKey(skin))) {
    return library;
  }
  return upsertStoredSkinLibrary(library, skin);
}

interface SkinContextValue {
  skin: StoredSkin | null;
  imported: StoredSkin[];
  setSkin: (skin: StoredSkin | null) => void;
  resetSkin: () => void;
}

const SkinContext = createContext<SkinContextValue | null>(null);

export function SkinProvider({ children }: { children: ReactNode }) {
  const { resolved } = useTheme();
  const [skin, setSkinState] = useState<StoredSkin | null>(() =>
    typeof window === 'undefined' ? null : readLocalSkin(),
  );
  const [imported, setImportedState] = useState<StoredSkin[]>(() =>
    typeof window === 'undefined'
      ? []
      : seedLibrary(readLocalLibrary(), readLocalSkin()),
  );

  useEffect(() => {
    if (isPreviewMode() && !skin) return;
    applyThemeToDocument(skin, document, resolved);
    writeLocalSkin(skin);
  }, [skin, resolved]);

  useEffect(() => {
    writeLocalLibrary(imported);
  }, [imported]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const stored = await browser.storage.local.get([
          SKIN_STORAGE_KEY,
          SKIN_LIBRARY_KEY,
        ]);
        const nextSkin = parseStoredSkin(stored[SKIN_STORAGE_KEY]);
        const nextLib = seedLibrary(
          parseStoredSkinLibrary(stored[SKIN_LIBRARY_KEY]),
          nextSkin,
        );
        if (
          nextLib.length &&
          JSON.stringify(nextLib) !== JSON.stringify(stored[SKIN_LIBRARY_KEY])
        ) {
          await browser.storage.local.set({ [SKIN_LIBRARY_KEY]: nextLib });
        }
        if (!cancelled) {
          setSkinState(nextSkin);
          setImportedState(nextLib);
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
      if (changes[SKIN_STORAGE_KEY]) {
        setSkinState(parseStoredSkin(changes[SKIN_STORAGE_KEY].newValue));
      }
      if (changes[SKIN_LIBRARY_KEY]) {
        setImportedState(
          parseStoredSkinLibrary(changes[SKIN_LIBRARY_KEY].newValue),
        );
      }
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
    if (next) {
      setImportedState((prev) => {
        const library = upsertStoredSkinLibrary(prev, next);
        writeLocalLibrary(library);
        void browser.storage.local
          .set({ [SKIN_STORAGE_KEY]: next, [SKIN_LIBRARY_KEY]: library })
          .catch(() => undefined);
        return library;
      });
      return;
    }
    void browser.storage.local.remove(SKIN_STORAGE_KEY).catch(() => undefined);
  }, []);

  const resetSkin = useCallback(() => {
    writeLocalSkin(null);
    writeLocalLibrary([]);
    setSkinState(null);
    setImportedState([]);
    void browser.storage.local
      .remove([SKIN_STORAGE_KEY, SKIN_LIBRARY_KEY])
      .catch(() => undefined);
  }, []);

  const value = useMemo(
    () => ({ skin, imported, setSkin, resetSkin }),
    [skin, imported, setSkin, resetSkin],
  );

  return <SkinContext.Provider value={value}>{children}</SkinContext.Provider>;
}

export function useSkin() {
  const ctx = useContext(SkinContext);
  if (!ctx) throw new Error('useSkin must be used within SkinProvider');
  return ctx;
}

export function useOptionalSkin() {
  return useContext(SkinContext);
}
