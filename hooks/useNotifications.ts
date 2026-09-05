import { useCallback, useEffect, useState } from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  unreadCount,
} from '@/lib/notifications';
import type { NotificationWithJoins } from '@/lib/database.types';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { buildDeepLink } from '@/lib/canonicalize';

export function useNotifications(userId: string | null | undefined) {
  const [items, setItems] = useState<NotificationWithJoins[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setItems([]);
      setUnread(0);
      return;
    }
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(userId),
        unreadCount(userId),
      ]);
      setItems(list);
      setUnread(count);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`notifs:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          load();
          const row = payload.new as NotificationWithJoins;
          try {
            browser.notifications.create(`ec-${row.id}`, {
              type: 'basic',
              iconUrl: '/icon/128.png',
              title: 'New reply on Everchat',
              message: row.body_preview || 'Someone replied to you',
            });
          } catch {
            /* notifications permission optional */
          }
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(channel);
    };
  }, [userId, load]);

  const openNotification = useCallback(
    async (n: NotificationWithJoins) => {
      await markNotificationRead(n.id);
      setItems((prev) =>
        prev.map((x) =>
          x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
        ),
      );
      setUnread((c) => Math.max(0, c - (n.read_at ? 0 : 1)));

      const url = buildDeepLink(n.page_url, n.message_id);
      const tab = await browser.tabs.create({ url });
      if (tab.id != null) {
        await browser.runtime.sendMessage({
          type: 'OPEN_PANEL_FOR_TAB',
          tabId: tab.id,
          focusMessageId: n.message_id,
        });
      }
    },
    [],
  );

  return { items, unread, loading, reload: load, openNotification };
}
