import { useCallback, useEffect, useRef, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { dateFnsLocaleFor } from '@/lib/dateFnsLocale';
import { Check, ChevronDown } from 'lucide-react';
import { Favicon } from '@/components/Favicon';
import { ListSentinel } from '@/components/ListSentinel';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useListSentinel } from '@/hooks/useListSentinel';
import { useLocale } from '@/hooks/useLocale';
import { canonicalize, hrefFromPage } from '@/lib/canonicalize';
import { DESCRIPTION_TRUNCATE, LIST_PAGE_SIZE } from '@/lib/constants';
import { appendUniqueById, pageHasMore } from '@/lib/listPage';
import {
  getRecentlyActivePages,
  getTrendingPages,
  type ExplorePageRow,
} from '@/lib/pages';
import {
  applyOnlineCounts,
  fetchPageOnlineCounts,
} from '@/lib/presence';
import { isSupabaseConfigured } from '@/lib/supabase';
import { toast } from 'sonner';

export type ExploreMode = 'trending' | 'new';

function hostFromCanonical(canonicalUrl: string): string {
  return canonicalize(`https://${canonicalUrl}`).host || canonicalUrl;
}

function normalizeTrending(rows: ExplorePageRow[]): ExplorePageRow[] {
  return rows.map((row) => ({
    ...row,
    url: row.url ?? null,
    last_active_at: row.last_active_at ?? null,
    message_count: row.message_count ?? 0,
    online_count: row.online_count ?? 0,
  }));
}

async function withOnlineCounts(
  rows: ExplorePageRow[],
): Promise<ExplorePageRow[]> {
  try {
    const counts = await fetchPageOnlineCounts(
      rows.map((row) => row.canonical_url),
    );
    return applyOnlineCounts(rows, counts);
  } catch {
    return applyOnlineCounts(rows, new Map());
  }
}

export function ExploreTab() {
  const { t, tError, locale } = useLocale();
  const [mode, setMode] = useState<ExploreMode>('trending');
  const [rows, setRows] = useState<ExplorePageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const rowsRef = useRef<ExplorePageRow[]>([]);
  const loadingMoreRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  rowsRef.current = rows;

  const fetchPage = useCallback(
    (offsetRows: ExplorePageRow[]) => {
      if (mode === 'trending') {
        return getTrendingPages(LIST_PAGE_SIZE, offsetRows.length).then(
          (data) => normalizeTrending(data as ExplorePageRow[]),
        );
      }
      const last = offsetRows[offsetRows.length - 1];
      return getRecentlyActivePages(LIST_PAGE_SIZE, {
        before: last?.last_active_at,
        excludeIds: offsetRows.map((row) => row.id),
      });
    },
    [mode],
  );

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) {
      setRows([]);
      setHasMore(false);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchPage([])
      .then((data) => withOnlineCounts(data))
      .then((data) => {
        if (cancelled) return;
        setRows(data);
        setHasMore(pageHasMore(data.length));
      })
      .catch((e) => {
        if (cancelled) return;
        setRows([]);
        setHasMore(false);
        setError(e);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    const tick = async () => {
      if (document.hidden) return;
      const current = rowsRef.current;
      if (!current.length) return;
      try {
        const counts = await fetchPageOnlineCounts(
          current.map((row) => row.canonical_url),
        );
        if (cancelled) return;
        setRows((prev) => applyOnlineCounts(prev, counts));
      } catch {
        /* keep last counts */
      }
    };

    const id = window.setInterval(() => {
      void tick();
    }, 20_000);
    const onVisibility = () => {
      if (!document.hidden) void tick();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [mode]);

  const loadMore = useCallback(async () => {
    if (!isSupabaseConfigured || loadingMoreRef.current || !hasMore) return;
    loadingMoreRef.current = true;
    setLoadingMore(true);
    try {
      const data = await withOnlineCounts(await fetchPage(rowsRef.current));
      setRows((prev) => appendUniqueById(prev, data, (row) => row.id));
      setHasMore(pageHasMore(data.length));
    } catch (e) {
      toast.error(tError(e));
    } finally {
      loadingMoreRef.current = false;
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, tError]);

  const sentinelRef = useListSentinel(
    hasMore && !loading && !error,
    () => {
      void loadMore();
    },
    scrollRef,
    rows.length,
  );

  const modeLabel =
    mode === 'trending' ? t('explore.trending') : t('explore.new');

  const open = async (row: ExplorePageRow) => {
    const url = hrefFromPage(row);
    const tab = await browser.tabs.create({ url });
    if (tab.id != null) {
      await browser.runtime.sendMessage({
        type: 'OPEN_PANEL_FOR_TAB',
        tabId: tab.id,
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-14 items-center gap-2 border-b border-[var(--color-border)] px-3 py-2">
        <span className="text-xs text-[var(--color-muted-foreground)]">
          {t('explore.mode')}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="xs"
              variant="outline"
              className="h-7 shrink-0 gap-1 py-0 ps-2.5 pe-2 font-normal"
            >
              {modeLabel}
              <ChevronDown className="size-3.5 shrink-0 opacity-60" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem
              onSelect={() => setMode('trending')}
              className="gap-2 pe-2"
            >
              <span className="flex size-3.5 items-center justify-center">
                {mode === 'trending' ? (
                  <Check className="size-3.5" aria-hidden />
                ) : null}
              </span>
              {t('explore.trending')}
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setMode('new')}
              className="gap-2 pe-2"
            >
              <span className="flex size-3.5 items-center justify-center">
                {mode === 'new' ? (
                  <Check className="size-3.5" aria-hidden />
                ) : null}
              </span>
              {t('explore.new')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3"
      >
        {loading &&
          rows.length === 0 &&
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-1 h-14 w-full" />
          ))}
        {error && rows.length === 0 ? (
          <div className="py-6 text-center text-sm text-[var(--color-destructive)]">
            {tError(error)}
            <div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                  fetchPage([])
                    .then((data) => withOnlineCounts(data))
                    .then((data) => {
                      setRows(data);
                      setHasMore(pageHasMore(data.length));
                    })
                    .catch((e) => {
                      setRows([]);
                      setError(e);
                    })
                    .finally(() => setLoading(false));
                }}
              >
                {t('chat.retry')}
              </Button>
            </div>
          </div>
        ) : null}
        {!loading && !error && rows.length === 0 && (
          <p className="px-1 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            {mode === 'trending' ? t('explore.emptyTrending') : t('explore.emptyNew')}
          </p>
        )}
        {rows.map((row) => {
            const host = hostFromCanonical(row.canonical_url);
            const showOnline = !(mode === 'new' && row.last_active_at);
            const live = showOnline && (row.online_count ?? 0) > 0;
            const activity = showOnline
              ? t('auth.trendingTalking', { count: row.online_count ?? 0 })
              : formatDistanceToNow(new Date(row.last_active_at!), {
                  addSuffix: true,
                  locale: dateFnsLocaleFor(locale),
                });

            return (
              <button
                key={row.id}
                type="button"
                onClick={() => open(row)}
                className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-start hover:bg-[var(--color-accent)]"
              >
                <Favicon src={row.favicon_url} className="mt-0.5" />
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate text-sm font-medium">
                    {row.title || host || row.canonical_url}
                  </div>
                  <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                    {host ||
                      (row.description || row.canonical_url).slice(
                        0,
                        DESCRIPTION_TRUNCATE,
                      )}
                  </div>
                  <div
                    className={
                      live
                        ? 'mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-success)]'
                        : 'mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-muted-foreground)]'
                    }
                  >
                    {live ? (
                      <span
                        className="size-1.5 shrink-0 rounded-full bg-[var(--color-success)]"
                        aria-hidden
                      />
                    ) : null}
                    {activity}
                  </div>
                </div>
              </button>
            );
          })}
        {hasMore ? (
          <ListSentinel sentinelRef={sentinelRef} loading={loadingMore} />
        ) : null}
      </div>
    </div>
  );
}
