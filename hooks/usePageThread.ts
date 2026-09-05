import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { upsertPage } from '@/lib/pages';
import {
  buildMessageTree,
  createMessage,
  fetchMessagesForPage,
  softDeleteMessage,
} from '@/lib/messages';
import { setVote } from '@/lib/votes';
import type {
  MessageNode,
  MessageWithAuthor,
  SortMode,
  TabInfo,
} from '@/lib/database.types';
import { toast } from 'sonner';

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
      const page = await upsertPage({
        canonicalUrl: tab.canonicalUrl,
        title: tab.title,
        faviconUrl: tab.favIconUrl,
      });
      setPageId(page.id);
      const { messages, votes } = await fetchMessagesForPage(page.id, userId);
      votesRef.current = votes;
      rebuild(messages, votes, sort);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab.canonicalUrl, tab.title, tab.favIconUrl, userId, sort, rebuild]);

  useEffect(() => {
    load();
  }, [load]);

  // Rebuild on sort change without refetch
  useEffect(() => {
    if (flat.length) {
      rebuild(flat, votesRef.current, sort);
    }
  }, [sort, flat, rebuild]);

  // Realtime
  useEffect(() => {
    if (!pageId || !isSupabaseConfigured) return;
    const sb = getSupabase();
    const channel = sb
      .channel(`page:${pageId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `page_id=eq.${pageId}`,
        },
        () => {
          // Refetch on any change for simplicity / correctness
          fetchMessagesForPage(pageId, userId).then(({ messages, votes }) => {
            votesRef.current = votes;
            rebuild(messages, votes, sort);
          });
        },
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
  }, [pageId, userId, sort, rebuild]);

  const post = useCallback(
    async (body: string, parentId?: string | null, gifUrl?: string | null) => {
      if (!pageId || !userId) throw new Error('Not ready');
      const msg = await createMessage({
        pageId,
        authorId: userId,
        parentId,
        body,
        gifUrl,
      });
      const next = [...flat.filter((m) => m.id !== msg.id), msg];
      rebuild(next, votesRef.current, sort);
      toast.success(parentId ? 'Reply sent' : 'Posted');
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
        toast.error((e as Error).message || 'Vote failed');
      }
    },
    [userId, flat, sort, rebuild],
  );

  const remove = useCallback(
    async (messageId: string) => {
      if (!userId) return;
      await softDeleteMessage(messageId, userId);
      const next = flat.map((m) =>
        m.id === messageId
          ? { ...m, deleted_at: new Date().toISOString(), body: '[deleted]' }
          : m,
      );
      rebuild(next, votesRef.current, sort);
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
