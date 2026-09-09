import { PREVIEW_TAB } from '@/lib/preview/fixtures';
import {
  applyThemeToDocument,
  SKIN_STORAGE_KEY,
  validateTheme,
} from '@/lib/theme';

type ChangeFn = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  area: string,
) => void;

type MessageFn = (message: unknown) => void;

function isAllowedParentOrigin(origin: string): boolean {
  if (origin === 'https://everch.at' || origin === 'https://www.everch.at') {
    return true;
  }
  try {
    const url = new URL(origin);
    return (
      url.protocol === 'http:' &&
      (url.hostname === '127.0.0.1' || url.hostname === 'localhost')
    );
  } catch {
    return false;
  }
}

export function installPreviewChrome(): void {
  const local: Record<string, unknown> = {};
  const storageListeners = new Set<ChangeFn>();
  const runtimeListeners = new Set<MessageFn>();

  const storage = {
    local: {
      get: async (key?: string | string[] | Record<string, unknown>) => {
        if (key == null) return { ...local };
        if (typeof key === 'string') return { [key]: local[key] };
        if (Array.isArray(key)) {
          const out: Record<string, unknown> = {};
          for (const k of key) out[k] = local[k];
          return out;
        }
        const out: Record<string, unknown> = { ...key };
        for (const k of Object.keys(key)) {
          if (k in local) out[k] = local[k];
        }
        return out;
      },
      set: async (items: Record<string, unknown>) => {
        const changes: Record<
          string,
          { newValue?: unknown; oldValue?: unknown }
        > = {};
        for (const [k, v] of Object.entries(items)) {
          changes[k] = { oldValue: local[k], newValue: v };
          local[k] = v;
        }
        for (const fn of storageListeners) fn(changes, 'local');
      },
      remove: async (key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        const changes: Record<
          string,
          { newValue?: unknown; oldValue?: unknown }
        > = {};
        for (const k of keys) {
          changes[k] = { oldValue: local[k] };
          delete local[k];
        }
        for (const fn of storageListeners) fn(changes, 'local');
      },
    },
    session: {
      get: async () => ({}),
      set: async () => undefined,
      remove: async () => undefined,
    },
    onChanged: {
      addListener: (fn: ChangeFn) => storageListeners.add(fn),
      removeListener: (fn: ChangeFn) => storageListeners.delete(fn),
    },
  };

  const runtime = {
    sendMessage: async (message: { type?: string }) => {
      if (message?.type === 'GET_ACTIVE_TAB') {
        return { ok: true, ...PREVIEW_TAB };
      }
      if (message?.type === 'GET_PENDING_FOCUS') {
        return { pendingFocus: null };
      }
      if (message?.type === 'PANEL_ATTENTION') {
        return { ok: true };
      }
      return { ok: true };
    },
    onMessage: {
      addListener: (fn: MessageFn) => runtimeListeners.add(fn),
      removeListener: (fn: MessageFn) => runtimeListeners.delete(fn),
    },
    getURL: (path: string) => path,
    getPlatformInfo: async () => ({ os: 'mac', arch: 'arm' }),
  };

  const api = {
    storage,
    runtime,
    tabs: {
      create: async () => ({ id: 2 }),
      update: async () => ({}),
      query: async () => [],
    },
    i18n: { getUILanguage: () => 'en' },
    notifications: {
      create: async () => undefined,
      clear: async () => undefined,
    },
    sidePanel: { open: async () => undefined },
    permissions: { contains: async () => false },
  };

  (globalThis as { browser: typeof api }).browser = api;
  (globalThis as { chrome: typeof api }).chrome = api;

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    if (!isAllowedParentOrigin(event.origin)) return;
    const data = event.data as { type?: string; theme?: unknown };
    if (data?.type !== 'EC_PREVIEW_THEME') return;
    const theme = validateTheme(data.theme);
    if (!theme) return;
    applyThemeToDocument(theme);
    void storage.local.set({ [SKIN_STORAGE_KEY]: theme });
  });
}
