import { useEffect, type Dispatch, type SetStateAction } from 'react';
import {
  applyOnlineCountChange,
  applyOnlineCounts,
  fetchPageOnlineCounts,
} from '@/lib/presence';
import { subscribePostgresChanges } from '@/lib/realtime';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';

/** Cheap TTL fallback; realtime handles joins/leaves. */
export const ONLINE_COUNT_POLL_MS = 45_000;

/** Cover a service-worker heartbeat that lands just after first paint. */
const MOUNT_REFRESH_MS = 1_500;

/**
 * Live `online_count` for rooms already in a list.
 * Subscribes to `page_online_counts` aggregates (no user_id) and polls
 * as a hidden-safe fallback. Does not insert new trending rooms.
 */
export function useOnlineCounts<T extends { canonical_url: string }>(
  rowsRef: { current: T[] },
  setRows: Dispatch<SetStateAction<T[]>>,
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return;
    let cancelled = false;
    const sb = getSupabase();

    const refresh = async () => {
      const urls = rowsRef.current.map((row) => row.canonical_url);
      if (!urls.length) return;
      try {
        const counts = await fetchPageOnlineCounts(urls);
        if (cancelled) return;
        setRows((prev) => applyOnlineCounts(prev, counts));
      } catch {
        /* keep last counts */
      }
    };

    const channel = subscribePostgresChanges(
      sb,
      'explore-online',
      {
        event: '*',
        schema: 'public',
        table: 'page_online_counts',
      },
      (payload) => {
        if (cancelled) return;
        setRows((prev) => applyOnlineCountChange(prev, payload));
      },
    );

    const extra = window.setTimeout(() => {
      void refresh();
    }, MOUNT_REFRESH_MS);
    const poll = window.setInterval(() => {
      void refresh();
    }, ONLINE_COUNT_POLL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(extra);
      window.clearInterval(poll);
      void sb.removeChannel(channel);
    };
  }, [enabled, rowsRef, setRows]);
}
