import { useCallback, useEffect, useRef, useState } from 'react';
import { ListSentinel } from '@/components/ListSentinel';
import { PageTitleBar } from '@/components/PageTitleBar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useListSentinel } from '@/hooks/useListSentinel';
import { useLocale } from '@/hooks/useLocale';
import { formatScore, scoreColorClass } from '@/lib/collapse';
import { LIST_PAGE_SIZE } from '@/lib/constants';
import { appendUniqueById } from '@/lib/listPage';
import {
  fetchLeaderboard,
  leaderboardHasMore,
  type LeaderboardPayload,
  type LeaderboardRow,
} from '@/lib/leaderboard';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface LeaderboardTabProps {
  onOpenProfile: (username: string) => void;
}

function handleInitials(username: string): string {
  return (username || '?').slice(0, 2).toUpperCase();
}

function rankColumnCh(ranks: number[]): number {
  const maxRank = ranks.reduce((max, rank) => Math.max(max, rank), 1);
  return String(maxRank).length;
}

function LeaderboardRow({
  row,
  onOpenProfile,
  rankCh,
}: {
  row: LeaderboardRow;
  onOpenProfile: (username: string) => void;
  rankCh: number;
}) {
  const { t } = useLocale();
  const handle = row.username || t('message.unknownAuthor');

  return (
    <button
      type="button"
      onClick={() => onOpenProfile(row.username)}
      className="group flex w-full items-center gap-2 rounded-md bg-transparent px-3 py-2 text-start hover:bg-[var(--color-accent)] active:bg-[var(--color-accent)] focus-visible:bg-[var(--color-accent)]"
    >
      <span
        className="shrink-0 text-end text-sm font-normal tabular-nums text-[var(--color-muted-foreground)]"
        style={{ width: `${rankCh}ch` }}
      >
        {row.rank}
      </span>
      <Avatar className="h-5 w-5 shrink-0">
        {row.avatar_url && <AvatarImage src={row.avatar_url} />}
        <AvatarFallback>{handleInitials(row.username)}</AvatarFallback>
      </Avatar>
      <span className="min-w-0 truncate text-sm font-medium">
        @{handle}
      </span>
      <span
        className={cn(
          'ms-auto shrink-0 text-sm font-normal tabular-nums',
          scoreColorClass(row.karma),
        )}
      >
        {formatScore(row.karma)}
      </span>
    </button>
  );
}

export function LeaderboardTab({ onOpenProfile }: LeaderboardTabProps) {
  const { t, tError } = useLocale();
  const { user } = useAuth();
  const [data, setData] = useState<LeaderboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const dataRef = useRef<LeaderboardPayload | null>(null);
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  dataRef.current = data;

  const applyPage = useCallback(
    (payload: LeaderboardPayload, append: boolean) => {
      setData((prev) => {
        if (!append || !prev) return payload;
        return {
          me: prev.me ?? payload.me,
          top: appendUniqueById(
            prev.top,
            payload.top,
            (row) => `${row.rank}-${row.username}`,
          ),
        };
      });
      const nextTop = append
        ? appendUniqueById(
            dataRef.current?.top ?? [],
            payload.top,
            (row) => `${row.rank}-${row.username}`,
          )
        : payload.top;
      setHasMore(leaderboardHasMore(nextTop.length, payload.top.length));
    },
    [],
  );

  const loadFirst = useCallback(() => {
    if (!isSupabaseConfigured) {
      setData({ me: null, top: [] });
      setError(null);
      setHasMore(false);
      setLoading(false);
      return;
    }

    const showLoading = !dataRef.current?.top.length && !dataRef.current?.me;
    if (showLoading) setLoading(true);
    setError(null);
    fetchLeaderboard(user?.id, { limit: LIST_PAGE_SIZE, offset: 0 })
      .then((payload) => applyPage(payload, false))
      .catch((e) => {
        setData(null);
        setHasMore(false);
        setError(e);
      })
      .finally(() => setLoading(false));
  }, [user?.id, applyPage]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = useCallback(async () => {
    if (!isSupabaseConfigured || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const offset = dataRef.current?.top.length ?? 0;
      const payload = await fetchLeaderboard(user?.id, {
        limit: LIST_PAGE_SIZE,
        offset,
      });
      applyPage(payload, true);
    } catch (e) {
      toast.error(tError(e, 'leaderboard.error'));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [user?.id, hasMore, applyPage, tError]);

  const me = data?.me ?? null;
  const top = data?.top ?? [];
  const sentinelRef = useListSentinel(
    hasMore && !loading && !error,
    () => {
      void loadMore();
    },
    scrollRef,
    top.length,
  );
  const empty = !loading && !error && !me && top.length === 0;
  const rankCh = rankColumnCh([
    ...(me ? [me.rank] : []),
    ...top.map((row) => row.rank),
  ]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageTitleBar>{t('leaderboard.title')}</PageTitleBar>
      <div className="flex min-h-0 flex-1 flex-col gap-0.5 px-3 pt-3">
        {me && !error && (
          <LeaderboardRow
            row={me}
            onOpenProfile={onOpenProfile}
            rankCh={rankCh}
          />
        )}

        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto"
        >
          {loading &&
            top.length === 0 &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          {error && top.length === 0 ? (
            <div className="py-6 text-center text-sm text-[var(--color-destructive)]">
              {tError(error, 'leaderboard.error')}
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={loadFirst}
                >
                  {t('chat.retry')}
                </Button>
              </div>
            </div>
          ) : null}
          {empty && (
            <p className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
              {t('leaderboard.empty')}
            </p>
          )}
          {top.map((row) => (
            <LeaderboardRow
              key={`${row.rank}-${row.username}`}
              row={row}
              onOpenProfile={onOpenProfile}
              rankCh={rankCh}
            />
          ))}
          {hasMore ? (
            <ListSentinel sentinelRef={sentinelRef} loading={loadingMore} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
