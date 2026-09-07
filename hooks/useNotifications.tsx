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
  fetchNotificationById,
  fetchNotifications,
  markNotificationRead,
  unreadCount,
} from '@/lib/notifications';
import type { NotificationWithJoins } from '@/lib/database.types';
import { subscribePostgresChanges } from '@/lib/realtime';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { hrefFromPage } from '@/lib/canonicalize';
import { useAuth } from '@/hooks/useAuth';
import { LIST_PAGE_SIZE } from '@/lib/constants';
import { appendUniqueById, pageHasMore, prependUniqueById } from '@/lib/listPage';
import { tError } from '@/lib/i18n/runtime';
import { toast } from 'sonner';

export type NotificationsValue = {
  items: NotificationWithJoins[];
  unread: number;
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  reload: () => Promise<void>;
  openNotification: (n: NotificationWithJoins) => Promise<void>;
};

const NotificationsContext = createContext<NotificationsValue | null>(null);

function useNotificationsState(userId: string | null | undefined): NotificationsValue {
  const [items, setItems] = useState<NotificationWithJoins[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const itemsRef = useRef<NotificationWithJoins[]>([]);
  const loadingMoreRef = useRef(false);
  itemsRef.current = items;

  const load = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) {
      setItems([]);
      setUnread(0);
      setHasMore(false);
      return;
    }
    const showLoading = itemsRef.current.length === 0;
    if (showLoading) setLoading(true);
    try {
      const [list, count] = await Promise.all([
        fetchNotifications(userId, { limit: LIST_PAGE_SIZE }),
        unreadCount(userId),
      ]);
      setItems(list);
      setUnread(count);
      setHasMore(pageHasMore(list.length));
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const loadMore = useCallback(async () => {
    if (!userId || !isSupabaseConfigured) return;
    if (loadingMoreRef.current || !hasMore) return;
    const before = itemsRef.current[itemsRef.current.length - 1]?.created_at;
    if (!before) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const next = await fetchNotifications(userId, {
        limit: LIST_PAGE_SIZE,
        before,
      });
      setItems((prev) => appendUniqueById(prev, next, (row) => row.id));
      setHasMore(pageHasMore(next.length));
    } catch (e) {
      toast.error(tError(e));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [userId, hasMore]);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

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
      (payload) => {
        const id = (payload.new as { id?: string } | undefined)?.id;
        if (!id || !active) return;
        void (async () => {
          try {
            const row = await fetchNotificationById(id);
            if (!active || !row) {
              if (active) void loadRef.current();
              return;
            }
            setItems((prev) => prependUniqueById(prev, [row], (item) => item.id));
            setUnread((count) => count + (row.read_at ? 0 : 1));
          } catch {
            if (active) void loadRef.current();
          }
        })();
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
    () => ({
      items,
      unread,
      loading,
      loadingMore,
      hasMore,
      loadMore,
      reload: load,
      openNotification,
    }),
    [items, unread, loading, loadingMore, hasMore, loadMore, load, openNotification],
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
