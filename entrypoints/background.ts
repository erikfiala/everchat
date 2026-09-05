import { canonicalize, parseFocusMessageId } from '@/lib/canonicalize';

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

export default defineBackground(() => {
  // Open side panel on action click
  browser.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: true })
    .catch(() => undefined);

  browser.tabs.onActivated.addListener(({ tabId }) => {
    broadcastTab(tabId);
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.title || changeInfo.favIconUrl) {
      broadcastTab(tabId);
    }
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
        try {
          await browser.sidePanel.open({ tabId });
        } catch {
          /* older chrome */
        }
        if (message.focusMessageId) {
          // Store pending focus for the panel
          await browser.storage.session.set({
            pendingFocus: {
              tabId,
              focusMessageId: message.focusMessageId,
            },
          });
          // Also try direct message
          setTimeout(() => {
            browser.runtime
              .sendMessage({
                type: 'FOCUS_MESSAGE',
                focusMessageId: message.focusMessageId,
              })
              .catch(() => undefined);
          }, 500);
        }
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

      sendResponse({ ok: false });
    })();
    return true;
  });

  // Chrome notification click → deep link already opened via inbox; no-op fallback
  browser.notifications.onClicked.addListener((notificationId) => {
    if (notificationId.startsWith('ec-')) {
      browser.notifications.clear(notificationId);
    }
  });
});
