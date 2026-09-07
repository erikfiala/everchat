import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { subscribePostgresChanges } from '@/lib/realtime';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getPageByCanonical, upsertPage } from '@/lib/pages';
import {
  buildMessageTree,
  createMessage,
  deleteMessage,
  fetchMessagesForPage,
} from '@/lib/messages';
import { setVote } from '@/lib/votes';
import type {
  MessageNode,
  MessageWithAuthor,
  SortMode,
  TabInfo,
} from '@/lib/database.types';
import { toast } from 'sonner';
import { getT, tError } from '@/lib/i18n/runtime';

export function usePageThread(
  tab: TabInfo,
  userId: string | null | undefined,
) {
  const [pageId, setPageId] = useState<string | null>(null);
  const [roots, setRoots] = useState<MessageNode[]>([]);
  const [flat, setFlat] = useState<MessageWithAuthor[]>([]);
  const [sort, setSort] = useState<SortMode>('best');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const votesRef = useRef<{ message_id: string; user_id: string; value: number }[]>(
    [],
  );

  const rebuild = useCallback(
    (
      messages: MessageWithAuthor[],
      votes: { message_id: string; user_id: string; value: number }[],
      mode: SortMode,
    ) => {
      setFlat(messages);
      setRoots(buildMessageTree(messages, votes, mode));
    },
    [],
  );

  const load = useCallback(async () => {
    if (!tab.canonicalUrl || !isSupabaseConfigured) {
      setPageId(null);
      setRoots([]);
      setFlat([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Page writes require a custom JWT (RLS). Lurkers may only read an
      // existing room; authenticated users upsert metadata when opening chat.
      const page = userId
        ? await upsertPage({
            canonicalUrl: tab.canonicalUrl,
            url: tab.url,
            title: tab.title,
            faviconUrl: tab.favIconUrl,
          })
        : await getPageByCanonical(tab.canonicalUrl);

      if (!page) {
        setPageId(null);
        setRoots([]);
        setFlat([]);
        return;
      }

      setPageId(page.id);
      const { messages, votes } = await fetchMessagesForPage(page.id, userId);
      votesRef.current = votes;
      rebuild(messages, votes, sort);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab.canonicalUrl, tab.url, tab.title, tab.favIconUrl, userId, sort, rebuild]);

  useEffect(() => {
    load();
  }, [load]);

  // Rebuild on sort change without refetch
  useEffect(() => {
    if (flat.length) {
      rebuild(flat, votesRef.current, sort);
    }
  }, [sort, flat, rebuild]);

  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const sortRef = useRef(sort);
  sortRef.current = sort;

  // Realtime
  useEffect(() => {
    if (!pageId || !isSupabaseConfigured) return;
    let active = true;
    const sb = getSupabase();
    const channel = subscribePostgresChanges(
      sb,
      `page:${pageId}`,
      {
        event: '*',
        schema: 'public',
        table: 'messages',
        filter: `page_id=eq.${pageId}`,
      },
      () => {
        if (!active) return;
        // Refetch on any change for simplicity / correctness
        void fetchMessagesForPage(pageId, userIdRef.current).then(
          ({ messages, votes }) => {
            if (!active) return;
            votesRef.current = votes;
            rebuild(messages, votes, sortRef.current);
          },
        );
      },
    );

    return () => {
      active = false;
      void sb.removeChannel(channel);
    };
  }, [pageId, rebuild]);

  const post = useCallback(
    async (body: string, parentId?: string | null, gifUrl?: string | null) => {
      if (!pageId || !userId) throw new Error('errors.notReady');
      const msg = await createMessage({
        pageId,
        authorId: userId,
        parentId,
        body,
        gifUrl,
      });
      const next = [...flat.filter((m) => m.id !== msg.id), msg];
      rebuild(next, votesRef.current, sort);
      const t = getT();
      toast.success(t(parentId ? 'toast.replySent' : 'toast.posted'));
      return msg;
    },
    [pageId, userId, flat, sort, rebuild],
  );

  const vote = useCallback(
    async (messageId: string, value: 1 | -1) => {
      if (!userId) return;
      try {
        await setVote({ messageId, userId, value });
        // Optimistic local vote map
        const existing = votesRef.current.find((v) => v.message_id === messageId);
        if (existing && existing.value === value) {
          votesRef.current = votesRef.current.filter(
            (v) => v.message_id !== messageId,
          );
        } else if (existing) {
          existing.value = value;
        } else {
          votesRef.current = [
            ...votesRef.current,
            { message_id: messageId, user_id: userId, value },
          ];
        }
        rebuild(flat, votesRef.current, sort);
      } catch (e) {
        toast.error(tError(e, 'toast.voteFailed'));
      }
    },
    [userId, flat, sort, rebuild],
  );

  const remove = useCallback(
    async (messageId: string) => {
      if (!userId) return;
      try {
        const result = await deleteMessage(messageId);
        if (result === 'tombstone') {
          const next = flat.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  body: '',
                  gif_url: null,
                  deleted_at: new Date().toISOString(),
                  score: 0,
                  upvotes: 0,
                  downvotes: 0,
                }
              : m,
          );
          votesRef.current = votesRef.current.filter(
            (v) => v.message_id !== messageId,
          );
          rebuild(next, votesRef.current, sort);
        } else {
          const without = flat.filter((m) => m.id !== messageId);
          // Drop local tombstones that no longer have children (matches DB purge)
          const childParents = new Set(
            without.map((m) => m.parent_id).filter(Boolean) as string[],
          );
          const next = without.filter(
            (m) => !(m.deleted_at && !childParents.has(m.id)),
          );
          votesRef.current = votesRef.current.filter(
            (v) => v.message_id !== messageId,
          );
          rebuild(next, votesRef.current, sort);
        }
        toast.success(getT()('toast.commentDeleted'));
      } catch (e) {
        toast.error(tError(e, 'toast.deleteFailed'));
      }
    },
    [userId, flat, sort, rebuild],
  );

  return {
    pageId,
    roots,
    flat,
    sort,
    setSort,
    loading,
    error,
    reload: load,
    post,
    vote,
    remove,
  };
}
