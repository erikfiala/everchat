import {
  canonicalize,
  hrefFromPage,
  isShareMessageId,
  parseFocusMessageId,
} from '@/lib/canonicalize';
import { loadSession, SESSION_KEY } from '@/lib/auth/session';
import { STORAGE_KEY as LOCALE_STORAGE_KEY } from '@/lib/i18n';
import { hydrateTranslatorFromStorage } from '@/lib/i18n/runtime';
import {
  createOsNotification,
  openOsNotification,
  OS_NOTIF_PREFIX,
  setPanelAttention,
} from '@/lib/os-notifications';
import type { Notification, PanelTab } from '@/lib/database.types';
import {
  isDefaultThemeSlug,
  isValidSlug,
  parseStoredSkin,
  SKIN_STORAGE_KEY,
} from '@/lib/theme';
import { getPageForMessage } from '@/lib/pages';
import {
  clearPagePresence,
  presenceKeyFromTabUrl,
  touchPagePresence,
} from '@/lib/presence';
import {
  getSupabase,
  isSupabaseConfigured,
  setSupabaseAccessToken,
} from '@/lib/supabase';
import { subscribePostgresChanges } from '@/lib/realtime';
import type { RealtimeChannel } from '@supabase/supabase-js';

type TabPayload = {
  tabId: number;
  url: string;
  title?: string;
  favIconUrl?: string;
  focusMessageId?: string | null;
};

async function getActiveTabPayload(): Promise<TabPayload | null> {
  const [tab] = await browser.tabs.query({
    active: true,
    lastFocusedWindow: true,
  });
  if (!tab?.id || !tab.url) return null;
  const focus = tab.url.includes('#')
    ? parseFocusMessageId(new URL(tab.url).hash)
    : null;
  return {
    tabId: tab.id,
    url: tab.url,
    title: tab.title,
    favIconUrl: tab.favIconUrl,
    focusMessageId: focus,
  };
}

function isEverchatWww(url?: string | null): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return host === 'everch.at' || host === 'www.everch.at';
  } catch {
    return false;
  }
}

async function openPanelForTab(
  tabId: number,
  focusMessageId?: string | null,
) {
  try {
    await browser.sidePanel.open({ tabId });
  } catch {
    /* older chrome */
  }
  if (!focusMessageId) return;
  await browser.storage.session.set({
    pendingFocus: {
      tabId,
      focusMessageId,
    },
  });
  setTimeout(() => {
    browser.runtime
      .sendMessage({
        type: 'FOCUS_MESSAGE',
        focusMessageId,
      })
      .catch(() => undefined);
  }, 500);
}

/** Same path as Activity: original page URL + Chat side panel. */
async function openSharedMessage(
  messageId: string,
  landingTabId?: number,
): Promise<{ ok: boolean }> {
  if (!isSupabaseConfigured) return { ok: false };
  try {
    const page = await getPageForMessage(messageId);
    if (!page) return { ok: false };
    const url = hrefFromPage(page);

    let tabId = landingTabId;
    if (tabId != null) {
      try {
        await browser.tabs.update(tabId, { url, active: true });
      } catch {
        tabId = undefined;
      }
    }
    if (tabId == null) {
      const tab = await browser.tabs.create({ url });
      tabId = tab.id ?? undefined;
      if (landingTabId != null && tabId != null && tabId !== landingTabId) {
        await browser.tabs.remove(landingTabId).catch(() => undefined);
      }
    }
    if (tabId == null) return { ok: false };
    await openPanelForTab(tabId, messageId);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

async function broadcastTab(tabId: number) {
  try {
    const tab = await browser.tabs.get(tabId);
    if (!tab.url) return;
    const focus = parseFocusMessageId(new URL(tab.url).hash);
    const msg = {
      type: 'TAB_UPDATED' as const,
      tabId,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
      focusMessageId: focus,
      canonicalUrl: canonicalize(tab.url).canonicalUrl,
    };
    await browser.runtime.sendMessage(msg).catch(() => undefined);
  } catch {
    /* tab may be gone */
  }
}

let notifChannel: RealtimeChannel | null = null;
let subscribedUserId: string | null = null;
/** In-memory dedupe for the same SW lifetime (Chrome id also replaces). */
const firedOsNotifIds = new Set<string>();

async function stopNotifRealtime() {
  if (notifChannel && isSupabaseConfigured) {
    try {
      const sb = getSupabase();
      await sb.removeChannel(notifChannel);
    } catch {
      /* ignore */
    }
  }
  notifChannel = null;
  subscribedUserId = null;
}

let startGate: Promise<void> = Promise.resolve();

async function startNotifRealtime(userId: string, token: string) {
  const run = startGate.then(() => startNotifRealtimeUnlocked(userId, token));
  startGate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function startNotifRealtimeUnlocked(userId: string, token: string) {
  if (!isSupabaseConfigured) return;
  if (subscribedUserId === userId && notifChannel) return;

  await stopNotifRealtime();
  setSupabaseAccessToken(token);

  const sb = getSupabase();
  await sb.realtime.setAuth(token);

  const channel = subscribePostgresChanges(
    sb,
    `bg-notifs:${userId}`,
    {
      event: 'INSERT',
      schema: 'public',
      table: 'notifications',
      filter: `recipient_id=eq.${userId}`,
    },
    (payload) => {
      const row = payload.new as Notification;
      if (!row?.id || firedOsNotifIds.has(row.id)) return;
      firedOsNotifIds.add(row.id);
      if (firedOsNotifIds.size > 200) {
        const first = firedOsNotifIds.values().next().value;
        if (first) firedOsNotifIds.delete(first);
      }
      void createOsNotification(row);
    },
  );

  notifChannel = channel;
  subscribedUserId = userId;
}

async function syncNotifRealtimeFromSession() {
  const session = await loadSession();
  if (!session) {
    setSupabaseAccessToken(null);
    await stopNotifRealtime();
    return;
  }
  await startNotifRealtime(session.id, session.token);
}

const PRESENCE_ALARM = 'everchat-presence';

/** True only after a successful touch this SW lifetime — skip clear RPCs when logged out. */
let presenceTracked = false;
let lastPresenceToken: string | null = null;
let presenceGate: Promise<void> = Promise.resolve();

function queuePagePresence() {
  const run = presenceGate.then(() => syncPagePresence());
  presenceGate = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function syncPagePresence() {
  if (!isSupabaseConfigured) return;
  try {
    const session = await loadSession();
    if (!session) {
      if (presenceTracked) {
        if (lastPresenceToken) setSupabaseAccessToken(lastPresenceToken);
        try {
          await clearPagePresence();
        } finally {
          presenceTracked = false;
          lastPresenceToken = null;
        }
      }
      return;
    }

    lastPresenceToken = session.token;
    setSupabaseAccessToken(session.token);

    const tab = await getActiveTabPayload();
    const canonical = presenceKeyFromTabUrl(tab?.url);
    if (!canonical) {
      if (presenceTracked) {
        await clearPagePresence();
        presenceTracked = false;
      }
      return;
    }

    await touchPagePresence(canonical);
    presenceTracked = true;
  } catch {
    /* SW must stay alive */
  }
}

export default defineBackground(() => {
  // Open side panel on action click
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);

  void hydrateTranslatorFromStorage();
  void syncNotifRealtimeFromSession();
  void queuePagePresence();

  if (browser.alarms) {
    void browser.alarms.create(PRESENCE_ALARM, { periodInMinutes: 1 });
    browser.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === PRESENCE_ALARM) void queuePagePresence();
    });
  }

  browser.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if (changes[SESSION_KEY]) {
      void (async () => {
        await queuePagePresence();
        await syncNotifRealtimeFromSession();
      })();
    }
    if (changes[LOCALE_STORAGE_KEY]) {
      void hydrateTranslatorFromStorage();
    }
  });

  browser.tabs.onActivated.addListener(({ tabId }) => {
    broadcastTab(tabId);
    void queuePagePresence();
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
      broadcastTab(tabId);
    }
    if (changeInfo.url) void queuePagePresence();
  });

  browser.windows.onFocusChanged.addListener(() => {
    void queuePagePresence();
  });

  browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    (async () => {
      if (message?.type === 'GET_ACTIVE_TAB') {
        const payload = await getActiveTabPayload();
        sendResponse(payload ? { ok: true, ...payload } : { ok: false });
        return;
      }

      if (message?.type === 'OPEN_PANEL_FOR_TAB') {
        const tabId = message.tabId as number;
        await openPanelForTab(tabId, message.focusMessageId);
        sendResponse({ ok: true });
        return;
      }

      if (message?.type === 'GET_PENDING_FOCUS') {
        const { pendingFocus } = await browser.storage.session.get(
          'pendingFocus',
        );
        await browser.storage.session.remove('pendingFocus');
        sendResponse({ ok: true, pendingFocus: pendingFocus ?? null });
        return;
      }

      if (message?.type === 'PANEL_ATTENTION') {
        const visible = Boolean(message.visible);
        const tab = (message.tab as PanelTab) || 'chat';
        await setPanelAttention({ visible, tab });
        sendResponse({ ok: true });
        return;
      }

      sendResponse({ ok: false });
    })();
    return true;
  });

  async function importThemeFromWww(
    slug: string,
    tabId?: number,
  ): Promise<{ ok: boolean }> {
    if (!isValidSlug(slug)) return { ok: false };
    if (isDefaultThemeSlug(slug)) {
      await browser.storage.local.remove(SKIN_STORAGE_KEY);
      if (tabId != null) {
        try {
          await browser.sidePanel.open({ tabId });
        } catch {
          /* older chrome */
        }
      }
      return { ok: true };
    }
    if (!isSupabaseConfigured) return { ok: false };
    try {
      const sb = getSupabase();
      const { data, error } = await sb
        .from('themes')
        .select('id, slug, name, author_name, font_family, tokens')
        .eq('slug', slug)
        .maybeSingle();
      if (error || !data) return { ok: false };
      const skin = parseStoredSkin({
        schemaVersion: 1,
        name: data.name,
        author: data.author_name,
        fontFamily: data.font_family,
        tokens: data.tokens,
        id: data.id,
        slug: data.slug,
      });
      if (!skin) return { ok: false };
      await browser.storage.local.set({ [SKIN_STORAGE_KEY]: skin });
      if (tabId != null) {
        try {
          await browser.sidePanel.open({ tabId });
        } catch {
          /* older chrome */
        }
      }
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }

  browser.runtime.onMessageExternal.addListener(
    (message, sender, sendResponse) => {
      (async () => {
        if (!isEverchatWww(sender.url)) {
          sendResponse({ ok: false });
          return;
        }
        if (message?.type === 'IMPORT_THEME') {
          const slug = typeof message.slug === 'string' ? message.slug : '';
          sendResponse(await importThemeFromWww(slug, sender.tab?.id));
          return;
        }
        if (message?.type !== 'OPEN_SHARED_MESSAGE') {
          sendResponse({ ok: false });
          return;
        }
        const messageId =
          typeof message.messageId === 'string' ? message.messageId : '';
        if (!isShareMessageId(messageId)) {
          sendResponse({ ok: false });
          return;
        }
        sendResponse(await openSharedMessage(messageId, sender.tab?.id));
      })();
      return true;
    },
  );

  browser.notifications.onClicked.addListener((notificationId) => {
    if (!notificationId.startsWith(OS_NOTIF_PREFIX)) return;
    void openOsNotification(notificationId);
  });
});
