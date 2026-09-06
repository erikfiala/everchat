import { useEffect, useMemo, useRef, useState } from 'react';
import type { TabInfo } from '@/lib/database.types';

type HistoryState = {
  entries: TabInfo[];
  index: number;
};

function snapshot(live: TabInfo, focusMessageId: string | null = null): TabInfo {
  return {
    tabId: live.tabId,
    url: live.url,
    title: live.title,
    favIconUrl: live.favIconUrl,
    canonicalUrl: live.canonicalUrl,
    host: live.host,
    focusMessageId,
  };
}

/**
 * In-panel URL/room history for the Chat tab.
 * Pushes when the live tab’s canonical room changes (redirects, navigations).
 * Back/forward move the viewing index without changing the browser tab.
 */
export function useRoomHistory(live: TabInfo) {
  const [state, setState] = useState<HistoryState>({ entries: [], index: 0 });
  const prevTabId = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    const tabChanged =
      prevTabId.current !== undefined && prevTabId.current !== live.tabId;
    prevTabId.current = live.tabId;

    if (!live.canonicalUrl) {
      if (tabChanged) {
        setState({ entries: [], index: 0 });
      }
      return;
    }

    setState((prev) => {
      if (tabChanged || prev.entries.length === 0) {
        return {
          entries: [snapshot(live, live.focusMessageId)],
          index: 0,
        };
      }

      const tipIdx = prev.entries.length - 1;
      const tip = prev.entries[tipIdx];
      if (tip && tip.canonicalUrl === live.canonicalUrl) {
        const entries = [...prev.entries];
        entries[tipIdx] = snapshot(live, live.focusMessageId);
        return { entries, index: prev.index };
      }

      const entries = [...prev.entries, snapshot(live)];
      return { entries, index: entries.length - 1 };
    });
  }, [
    live.tabId,
    live.canonicalUrl,
    live.url,
    live.title,
    live.favIconUrl,
    live.host,
    live.focusMessageId,
  ]);

  const atTip =
    state.entries.length === 0 || state.index >= state.entries.length - 1;

  const viewing = useMemo((): TabInfo => {
    const entry = state.entries[state.index];
    if (!entry) return live;
    if (atTip) {
      return { ...entry, focusMessageId: live.focusMessageId };
    }
    return { ...entry, focusMessageId: null };
  }, [state.entries, state.index, atTip, live]);

  const canGoBack = state.index > 0;
  const canGoForward =
    state.entries.length > 0 && state.index < state.entries.length - 1;

  return {
    viewing,
    canGoBack,
    canGoForward,
    goBack: () =>
      setState((prev) => ({
        ...prev,
        index: Math.max(0, prev.index - 1),
      })),
    goForward: () =>
      setState((prev) => ({
        ...prev,
        index: Math.min(prev.entries.length - 1, prev.index + 1),
      })),
  };
}
