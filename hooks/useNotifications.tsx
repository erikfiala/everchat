import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchNotifications,
  markNotificationRead,
  unreadCount,
} from '@/lib/notifications';
import type { NotificationWithJoins } from '@/lib/database.types';
import { subscribePostgresChanges } from '@/lib/realtime';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { hrefFromPage } from '@/lib/canonicalize';
import { useAuth } from '@/hooks/useAuth';

export type NotificationsValue = {
  items: NotificationWithJoins[];
  unread: number;
  loading: boolean;
  reload: () => Promise<void>;
  openNotification: (n: NotificationWithJoins) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

function useNotificationsState(userId: string | null | undefined): NotificationsValue {
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

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  // Inbox + unread badge only. Chrome OS toasts live in the background SW
  // so they still fire when the side panel is closed.
  useEffect(() => {
    if (!userId || !isSupabaseConfigured) return;
    let active = true;
    const sb = getSupabase();
    const channel = subscribePostgresChanges(
      sb,
      `notifs:${userId}`,
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `recipient_id=eq.${userId}`,
      },
      () => {
        if (active) void loadRef.current();
      },
    );
    return () => {
      active = false;
      void sb.removeChannel(channel);
    };
  }, [userId]);

  const openNotification = useCallback(async (n: NotificationWithJoins) => {
    await markNotificationRead(n.id);
    setItems((prev) =>
      prev.map((x) =>
        x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x,
      ),
    );
    setUnread((c) => Math.max(0, c - (n.read_at ? 0 : 1)));

    const url = n.page ? hrefFromPage(n.page) : n.page_url;
    const tab = await browser.tabs.create({ url });
    if (tab.id != null) {
      await browser.runtime.sendMessage({
        type: 'OPEN_PANEL_FOR_TAB',
        tabId: tab.id,
        focusMessageId: n.message_id,
      });
    }
  }, []);

  return useMemo(
    () => ({ items, unread, loading, reload: load, openNotification }),
    [items, unread, loading, load, openNotification],
  );
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const value = useNotificationsState(user?.id);
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications outside provider');
  return ctx;
}
