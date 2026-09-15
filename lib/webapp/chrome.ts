import { canonicalize, coercePasteUrl } from '@/lib/canonicalize';
import { googleS2FaviconForHost } from '@/lib/favicon';

const THEME_STORAGE_KEY = 'ec-theme';
const LAST_URL_KEY = 'ec-webapp-last-url';
const VIRTUAL_TAB_ID = 1;

type ChangeFn = (
  changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
  area: string,
) => void;

type MessageFn = (message: unknown) => void;

type VirtualTab = {
  tabId: number;
  url: string | null;
  title: string | null;
  favIconUrl: string | null;
  focusMessageId: string | null;
};

function readStorageJson(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return undefined;
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}

function writeStorageJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota / private mode */
  }
}

function removeStorageKey(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function hostTitle(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return canonicalize(url).host || url;
  }
}

function faviconForUrl(url: string): string | null {
  const host = canonicalize(url).host;
  return host ? googleS2FaviconForHost(host) : null;
}

function readQueryUrl(): string | null {
  try {
    const raw = new URLSearchParams(window.location.search).get('url');
    if (!raw) return null;
    return coercePasteUrl(raw);
  } catch {
    return null;
  }
}

function readLastUrl(): string | null {
  try {
    const raw = localStorage.getItem(LAST_URL_KEY);
    if (!raw) return null;
    return coercePasteUrl(raw);
  } catch {
    return null;
  }
}

function persistLastUrl(url: string | null): void {
  try {
    if (!url) {
      localStorage.removeItem(LAST_URL_KEY);
      return;
    }
    localStorage.setItem(LAST_URL_KEY, url);
  } catch {
    /* ignore */
  }
}

function syncAddressBar(url: string | null): void {
  try {
    const next = new URL(window.location.href);
    if (url) next.searchParams.set('url', url);
    else next.searchParams.delete('url');
    const href = `${next.pathname}${next.search}${next.hash}`;
    if (
      href !==
      `${window.location.pathname}${window.location.search}${window.location.hash}`
    ) {
      window.history.replaceState(null, '', href);
    }
  } catch {
    /* ignore */
  }
}

function tabPayload(tab: VirtualTab) {
  const canon = tab.url ? canonicalize(tab.url) : null;
  return {
    ok: true as const,
    tabId: tab.tabId,
    url: tab.url ?? undefined,
    title: tab.title ?? undefined,
    favIconUrl: tab.favIconUrl ?? undefined,
    focusMessageId: tab.focusMessageId,
    canonicalUrl: canon?.canonicalUrl,
  };
}

export function installWebAppChrome(): void {
  const storageListeners = new Set<ChangeFn>();
  const runtimeListeners = new Set<MessageFn>();

  let pendingFocus: { focusMessageId: string } | null = null;

  const initialUrl = readQueryUrl() ?? readLastUrl();
  let activeTab: VirtualTab = {
    tabId: VIRTUAL_TAB_ID,
    url: initialUrl,
    title: initialUrl ? hostTitle(initialUrl) : null,
    favIconUrl: initialUrl ? faviconForUrl(initialUrl) : null,
    focusMessageId: initialUrl
      ? canonicalize(initialUrl).focusMessageId
      : null,
  };
  if (initialUrl) {
    persistLastUrl(initialUrl);
    syncAddressBar(initialUrl);
  }

  const emit = (message: unknown) => {
    for (const fn of runtimeListeners) fn(message);
  };

  const setActiveUrl = (
    rawUrl: string,
    opts?: { focusMessageId?: string | null; title?: string | null },
  ) => {
    const url = coercePasteUrl(rawUrl) ?? rawUrl;
    const canon = canonicalize(url);
    activeTab = {
      tabId: VIRTUAL_TAB_ID,
      url,
      title: opts?.title?.trim() || hostTitle(url),
      favIconUrl: faviconForUrl(url),
      focusMessageId:
        opts?.focusMessageId !== undefined
          ? opts.focusMessageId
          : canon.focusMessageId,
    };
    persistLastUrl(url);
    syncAddressBar(url);
    emit({
      type: 'TAB_UPDATED',
      ...tabPayload(activeTab),
    });
  };

  const storage = {
    local: {
      get: async (key?: string | string[] | Record<string, unknown>) => {
        if (key == null) {
          const out: Record<string, unknown> = {};
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k) continue;
            out[k] = readStorageJson(k);
          }
          return out;
        }
        if (typeof key === 'string') {
          return { [key]: readStorageJson(key) };
        }
        if (Array.isArray(key)) {
          const out: Record<string, unknown> = {};
          for (const k of key) out[k] = readStorageJson(k);
          return out;
        }
        const out: Record<string, unknown> = { ...key };
        for (const k of Object.keys(key)) {
          const v = readStorageJson(k);
          if (v !== undefined) out[k] = v;
        }
        return out;
      },
      set: async (items: Record<string, unknown>) => {
        const changes: Record<
          string,
          { newValue?: unknown; oldValue?: unknown }
        > = {};
        for (const [k, v] of Object.entries(items)) {
          changes[k] = { oldValue: readStorageJson(k), newValue: v };
          writeStorageJson(k, v);
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
          changes[k] = { oldValue: readStorageJson(k) };
          removeStorageKey(k);
        }
        for (const fn of storageListeners) fn(changes, 'local');
      },
    },
    session: {
      get: async (key?: string | string[] | Record<string, unknown>) => {
        if (typeof key === 'string' && key === 'pendingFocus') {
          return { pendingFocus };
        }
        return {};
      },
      set: async () => undefined,
      remove: async (key: string | string[]) => {
        const keys = Array.isArray(key) ? key : [key];
        if (keys.includes('pendingFocus')) pendingFocus = null;
      },
    },
    onChanged: {
      addListener: (fn: ChangeFn) => storageListeners.add(fn),
      removeListener: (fn: ChangeFn) => storageListeners.delete(fn),
    },
  };

  const runtime = {
    sendMessage: async (message: {
      type?: string;
      url?: string;
      tabId?: number;
      focusMessageId?: string | null;
      title?: string | null;
    }) => {
      if (message?.type === 'GET_ACTIVE_TAB') {
        return tabPayload(activeTab);
      }
      if (message?.type === 'GET_PENDING_FOCUS') {
        const focus = pendingFocus;
        pendingFocus = null;
        return { ok: true, pendingFocus: focus };
      }
      if (message?.type === 'SET_ACTIVE_TAB_URL' && message.url) {
        setActiveUrl(message.url, {
          focusMessageId: message.focusMessageId ?? null,
          title: message.title,
        });
        return tabPayload(activeTab);
      }
      if (message?.type === 'OPEN_PANEL_FOR_TAB') {
        if (message.focusMessageId) {
          pendingFocus = { focusMessageId: message.focusMessageId };
          activeTab = {
            ...activeTab,
            focusMessageId: message.focusMessageId,
          };
          emit({
            type: 'FOCUS_MESSAGE',
            focusMessageId: message.focusMessageId,
          });
        }
        return { ok: true };
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
      create: async (createProps?: { url?: string }) => {
        if (createProps?.url) {
          setActiveUrl(createProps.url);
        }
        return { id: VIRTUAL_TAB_ID };
      },
      update: async (
        _tabId: number,
        updateProps?: { url?: string; active?: boolean },
      ) => {
        if (updateProps?.url) setActiveUrl(updateProps.url);
        return {};
      },
      query: async () =>
        activeTab.url
          ? [{ id: activeTab.tabId, url: activeTab.url, active: true }]
          : [],
      remove: async () => undefined,
    },
    i18n: {
      getUILanguage: () =>
        (typeof navigator !== 'undefined' && navigator.language) || 'en',
    },
    notifications: {
      create: async () => undefined,
      clear: async () => undefined,
    },
    sidePanel: { open: async () => undefined },
    permissions: { contains: async () => false },
  };

  (globalThis as unknown as { browser: typeof api }).browser = api;
  (globalThis as unknown as { chrome: typeof api }).chrome = api;

  // Seed theme preference into the mirrored storage map if present.
  try {
    const theme = localStorage.getItem(THEME_STORAGE_KEY);
    if (theme === 'light' || theme === 'dark' || theme === 'system') {
      writeStorageJson(THEME_STORAGE_KEY, theme);
    }
  } catch {
    /* ignore */
  }
}
