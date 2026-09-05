import { buildDeepLink } from './canonicalize';
import type { Notification, PanelTab } from './database.types';
import { markNotificationRead } from './notifications';
import { getSupabase, isSupabaseConfigured } from './supabase';

export const OS_NOTIF_PREFIX = 'ec-';
export const PANEL_ATTENTION_KEY = 'panelAttention';
export const OS_NOTIF_META_KEY = 'osNotifMeta';

export type PanelAttention = {
  visible: boolean;
  tab: PanelTab;
  updatedAt: number;
};

export type OsNotifMeta = {
  notificationId: string;
  pageUrl: string;
  messageId: string;
};

type MetaStore = Record<string, OsNotifMeta>;

/** Skip OS toast when the side panel is open on the Notifications inbox. */
export async function shouldShowOsNotification(): Promise<boolean> {
  try {
    const { [PANEL_ATTENTION_KEY]: attention } =
      await browser.storage.session.get(PANEL_ATTENTION_KEY);
    const a = attention as PanelAttention | undefined;
    if (!a) return true;
    // Stale heartbeat (>30s) → treat panel as unfocused
    if (Date.now() - a.updatedAt > 30_000) return true;
    if (a.visible && a.tab === 'notifications') return false;
    return true;
  } catch {
    return true;
  }
}

export async function setPanelAttention(
  patch: Pick<PanelAttention, 'visible' | 'tab'>,
): Promise<void> {
  await browser.storage.session.set({
    [PANEL_ATTENTION_KEY]: {
      ...patch,
      updatedAt: Date.now(),
    } satisfies PanelAttention,
  });
}

export async function rememberOsNotifMeta(meta: OsNotifMeta): Promise<void> {
  const chromeId = `${OS_NOTIF_PREFIX}${meta.notificationId}`;
  const { [OS_NOTIF_META_KEY]: existing } =
    await browser.storage.session.get(OS_NOTIF_META_KEY);
  const store = (existing as MetaStore | undefined) ?? {};
  store[chromeId] = meta;
  // Cap size so session storage stays small
  const keys = Object.keys(store);
  if (keys.length > 50) {
    for (const k of keys.slice(0, keys.length - 40)) {
      delete store[k];
    }
  }
  await browser.storage.session.set({ [OS_NOTIF_META_KEY]: store });
}

export async function takeOsNotifMeta(
  chromeNotificationId: string,
): Promise<OsNotifMeta | null> {
  const { [OS_NOTIF_META_KEY]: existing } =
    await browser.storage.session.get(OS_NOTIF_META_KEY);
  const store = (existing as MetaStore | undefined) ?? {};
  const meta = store[chromeNotificationId] ?? null;
  if (meta) {
    delete store[chromeNotificationId];
    await browser.storage.session.set({ [OS_NOTIF_META_KEY]: store });
  }
  return meta;
}

async function actorUsername(actorId: string): Promise<string | null> {
  if (!isSupabaseConfigured) return null;
  try {
    const sb = getSupabase();
    const { data } = await sb
      .from('profiles')
      .select('username')
      .eq('id', actorId)
      .maybeSingle();
    return data?.username ?? null;
  } catch {
    return null;
  }
}

/**
 * Create a Chrome OS notification for a notifications-table INSERT.
 * Idempotent per row id (`ec-{uuid}` replaces if re-fired).
 */
export async function createOsNotification(
  row: Pick<
    Notification,
    'id' | 'actor_id' | 'message_id' | 'page_url' | 'body_preview' | 'read_at'
  >,
): Promise<void> {
  if (row.read_at) return;
  if (!(await shouldShowOsNotification())) return;

  const handle = await actorUsername(row.actor_id);
  const title = handle ? `@${handle} replied` : 'New reply on Everchat';
  const message =
    (row.body_preview || '').trim() || 'Someone replied to your comment';

  await rememberOsNotifMeta({
    notificationId: row.id,
    pageUrl: row.page_url,
    messageId: row.message_id,
  });

  try {
    await browser.notifications.create(`${OS_NOTIF_PREFIX}${row.id}`, {
      type: 'basic',
      iconUrl: browser.runtime.getURL('/icon/128.png'),
      title,
      message,
      priority: 1,
    });
  } catch {
    /* notifications API unavailable */
  }
}

/** Open page deep link + side panel Chat focus (same path as inbox click). */
export async function openOsNotification(
  chromeNotificationId: string,
): Promise<void> {
  const meta = await takeOsNotifMeta(chromeNotificationId);
  await browser.notifications.clear(chromeNotificationId).catch(() => undefined);

  if (!meta) return;

  try {
    await markNotificationRead(meta.notificationId);
  } catch {
    /* best-effort; inbox can still mark later */
  }

  const url = buildDeepLink(meta.pageUrl, meta.messageId);
  const tab = await browser.tabs.create({ url });
  if (tab.id == null) return;

  try {
    await browser.sidePanel.open({ tabId: tab.id });
  } catch {
    /* older Chrome */
  }

  await browser.storage.session.set({
    pendingFocus: {
      tabId: tab.id,
      focusMessageId: meta.messageId,
    },
  });

  setTimeout(() => {
    browser.runtime
      .sendMessage({
        type: 'FOCUS_MESSAGE',
        focusMessageId: meta.messageId,
      })
      .catch(() => undefined);
  }, 500);
}
