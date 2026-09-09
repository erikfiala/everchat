import { useCallback, useEffect, useRef, useState } from 'react';
import { subscribePostgresChanges } from '@/lib/realtime';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { getPageByCanonical, upsertPage } from '@/lib/pages';
import {
  buildMessageTree,
  createMessage,
  deleteMessage,
  fetchMessageWithAuthor,
  fetchMessagesForPage,
  fetchThreadContainingMessage,
  fetchVotesForMessages,
} from '@/lib/messages';
import { appendUniqueById } from '@/lib/listPage';
import { LIST_PAGE_SIZE } from '@/lib/constants';
import { setVote } from '@/lib/votes';
import type {
  MessageNode,
  MessageWithAuthor,
  SortMode,
  TabInfo,
  Vote,
} from '@/lib/database.types';
import { toast } from 'sonner';
import { getT, tError } from '@/lib/i18n/runtime';
import { PREVIEW_MESSAGES } from '@/lib/preview/fixtures';
import { isPreviewMode } from '@/lib/preview/mode';

function mergeVotes(existing: Vote[], incoming: Vote[]): Vote[] {
  if (!incoming.length) return existing;
  const seen = new Set(existing.map((vote) => vote.message_id));
  const extra = incoming.filter((vote) => {
    if (seen.has(vote.message_id)) return false;
    seen.add(vote.message_id);
    return true;
  });
  return extra.length ? [...existing, ...extra] : existing;
}

export function usePageThread(
  tab: TabInfo,
  userId: string | null | undefined,
) {
  const [pageId, setPageId] = useState<string | null>(null);
  const [roots, setRoots] = useState<MessageNode[]>([]);
  const [flat, setFlat] = useState<MessageWithAuthor[]>([]);
  const [sort, setSort] = useState<SortMode>('best');
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const votesRef = useRef<Vote[]>([]);
  const flatRef = useRef<MessageWithAuthor[]>([]);
  const rootOffsetRef = useRef(0);
  const loadingMoreRef = useRef(false);
  const userIdRef = useRef(userId);
  const sortRef = useRef(sort);
  const roomKeyRef = useRef(tab.canonicalUrl);
  userIdRef.current = userId;
  sortRef.current = sort;

  const rebuild = useCallback(
    (
      messages: MessageWithAuthor[],
      votes: Vote[],
      mode: SortMode,
    ) => {
      flatRef.current = messages;
      setFlat(messages);
      setRoots(buildMessageTree(messages, votes, mode));
    },
    [],
  );

  const load = useCallback(async () => {
    if (isPreviewMode()) {
      setPageId('preview-page');
      setHasMore(false);
      setError(null);
      setLoading(false);
      rebuild(PREVIEW_MESSAGES, [], sortRef.current);
      return;
    }
    if (!tab.canonicalUrl || !isSupabaseConfigured) {
      setPageId(null);
      setRoots([]);
      setFlat([]);
      flatRef.current = [];
      setHasMore(false);
      rootOffsetRef.current = 0;
      return;
    }
    const roomChanged = roomKeyRef.current !== tab.canonicalUrl;
    roomKeyRef.current = tab.canonicalUrl;
    if (roomChanged) {
      setRoots([]);
      setFlat([]);
      flatRef.current = [];
      setHasMore(false);
      votesRef.current = [];
    }
    rootOffsetRef.current = 0;
    const showLoading = flatRef.current.length === 0;
    if (showLoading) setLoading(true);
    setError(null);
    try {
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
        flatRef.current = [];
        setHasMore(false);
        rootOffsetRef.current = 0;
        return;
      }

      setPageId(page.id);
      const { messages, votes, rootCount, hasMore: more } =
        await fetchMessagesForPage(page.id, userId, {
          sort,
          offset: 0,
          limit: LIST_PAGE_SIZE,
        });
      votesRef.current = votes;
      rootOffsetRef.current = rootCount;
      setHasMore(more);
      rebuild(messages, votes, sort);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [tab.canonicalUrl, tab.url, tab.title, tab.favIconUrl, userId, sort, rebuild]);

  useEffect(() => {
    rootOffsetRef.current = 0;
    void load();
  }, [load]);

  const loadMore = useCallback(async () => {
    if (!pageId || !isSupabaseConfigured) return;
    if (loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const { messages, votes, rootCount, hasMore: more } =
        await fetchMessagesForPage(pageId, userId, {
          sort,
          offset: rootOffsetRef.current,
          limit: LIST_PAGE_SIZE,
        });
      rootOffsetRef.current += rootCount;
      setHasMore(more);
      votesRef.current = mergeVotes(votesRef.current, votes);
      rebuild(
        appendUniqueById(flatRef.current, messages, (row) => row.id),
        votesRef.current,
        sort,
      );
    } catch (e) {
      toast.error(tError(e));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [pageId, userId, sort, hasMore, rebuild]);

  const ensureMessage = useCallback(
    async (messageId: string) => {
      if (!pageId || !isSupabaseConfigured) return;
      if (flatRef.current.some((row) => row.id === messageId)) return;
      const result = await fetchThreadContainingMessage(
        pageId,
        messageId,
        userId,
      );
      if (!result) return;
      votesRef.current = mergeVotes(votesRef.current, result.votes);
      rebuild(
        appendUniqueById(flatRef.current, result.messages, (row) => row.id),
        votesRef.current,
        sort,
      );
    },
    [pageId, userId, sort, rebuild],
  );

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
      (payload) => {
        if (!active) return;
        const row = payload as {
          new?: { id?: string };
          old?: { id?: string };
        };
        const id = row.new?.id ?? row.old?.id;
        if (!id) return;

        void (async () => {
          try {
            const msg = await fetchMessageWithAuthor(id);
            if (!active) return;
            if (!msg || msg.page_id !== pageId) {
              const next = flatRef.current.filter((item) => item.id !== id);
              if (next.length !== flatRef.current.length) {
                votesRef.current = votesRef.current.filter(
                  (vote) => vote.message_id !== id,
                );
                rebuild(next, votesRef.current, sortRef.current);
              }
              return;
            }

            const loaded = flatRef.current;
            const already = loaded.some((item) => item.id === msg.id);
            if (
              msg.parent_id &&
              !already &&
              !loaded.some((item) => item.id === msg.parent_id)
            ) {
              return;
            }

            const next = already
              ? loaded.map((item) => (item.id === msg.id ? msg : item))
              : appendUniqueById(loaded, [msg], (item) => item.id);

            if (userIdRef.current && !already) {
              const extraVotes = await fetchVotesForMessages(userIdRef.current, [
                msg.id,
              ]);
              if (!active) return;
              votesRef.current = mergeVotes(votesRef.current, extraVotes);
            }

            rebuild(next, votesRef.current, sortRef.current);
          } catch {
            /* keep the paged list; next interaction can refresh */
          }
        })();
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
      const next = appendUniqueById(
        flatRef.current.filter((m) => m.id !== msg.id),
        [msg],
        (row) => row.id,
      );
      rebuild(next, votesRef.current, sort);
      const t = getT();
      toast.success(t(parentId ? 'toast.replySent' : 'toast.posted'));
      return msg;
    },
    [pageId, userId, sort, rebuild],
  );

  const vote = useCallback(
    async (messageId: string, value: 1 | -1) => {
      if (!userId) return;
      try {
        await setVote({ messageId, userId, value });
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
        rebuild(flatRef.current, votesRef.current, sort);
      } catch (e) {
        toast.error(tError(e, 'toast.voteFailed'));
      }
    },
    [userId, sort, rebuild],
  );

  const remove = useCallback(
    async (messageId: string) => {
      if (!userId) return;
      try {
        const result = await deleteMessage(messageId);
        if (result === 'tombstone') {
          const next = flatRef.current.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  body: '',
                  gif_url: null,
                  deleted_at: new Date().toISOString(),
                  score: 0,
                  upvotes: 0,
                  downvotes: 0,
                  author: null,
                }
              : m,
          );
          votesRef.current = votesRef.current.filter(
            (v) => v.message_id !== messageId,
          );
          rebuild(next, votesRef.current, sort);
        } else {
          const without = flatRef.current.filter((m) => m.id !== messageId);
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
    [userId, sort, rebuild],
  );

  return {
    pageId,
    roots,
    flat,
    sort,
    setSort,
    loading,
    loadingMore,
    hasMore,
    error,
    reload: load,
    loadMore,
    ensureMessage,
    post,
    vote,
    remove,
  };
}
