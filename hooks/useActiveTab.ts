import { useEffect, useState } from 'react';
import { canonicalize } from '@/lib/canonicalize';
import type { TabInfo } from '@/lib/database.types';

const empty: TabInfo = {
  tabId: null,
  url: null,
  title: null,
  favIconUrl: null,
  canonicalUrl: null,
  focusMessageId: null,
  host: null,
};

function fromPayload(payload: {
  tabId?: number;
  url?: string;
  title?: string;
  favIconUrl?: string;
  focusMessageId?: string | null;
}): TabInfo {
  if (!payload.url) return empty;
  const canon = canonicalize(payload.url);
  return {
    tabId: payload.tabId ?? null,
    url: payload.url,
    title: payload.title ?? null,
    favIconUrl: payload.favIconUrl ?? null,
    canonicalUrl: canon.canonicalUrl,
    focusMessageId: payload.focusMessageId ?? canon.focusMessageId,
    host: canon.host,
  };
}

export function useActiveTab() {
  const [tab, setTab] = useState<TabInfo>(empty);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const request = async () => {
      try {
        const res = await browser.runtime.sendMessage({ type: 'GET_ACTIVE_TAB' });
        if (!cancelled && res?.ok) {
          setTab(fromPayload(res));
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    request();

    // Pending focus from notification / activity deep link
    browser.runtime
      .sendMessage({ type: 'GET_PENDING_FOCUS' })
      .then((res) => {
        if (res?.pendingFocus?.focusMessageId) {
          setTab((prev) => ({
            ...prev,
            focusMessageId: res.pendingFocus.focusMessageId,
          }));
        }
      })
      .catch(() => undefined);

    const onMessage = (msg: {
      type?: string;
      tabId?: number;
      url?: string;
      title?: string;
      favIconUrl?: string;
      focusMessageId?: string | null;
    }) => {
      if (msg?.type === 'TAB_UPDATED') {
        setTab(fromPayload(msg));
      }
      if (msg?.type === 'FOCUS_MESSAGE' && msg.focusMessageId) {
        setTab((prev) => ({
          ...prev,
          focusMessageId: msg.focusMessageId ?? null,
        }));
      }
    };

    browser.runtime.onMessage.addListener(onMessage);
    return () => {
      cancelled = true;
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  const clearFocus = () =>
    setTab((prev) => ({ ...prev, focusMessageId: null }));

  return { tab, ready, clearFocus };
}
