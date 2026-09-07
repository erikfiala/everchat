import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { dateFnsLocaleFor } from '@/lib/dateFnsLocale';
import { Check, ChevronDown } from 'lucide-react';
import { Favicon } from '@/components/Favicon';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/hooks/useLocale';
import { canonicalize, hrefFromPage } from '@/lib/canonicalize';
import { DESCRIPTION_TRUNCATE, TRENDING_LIMIT } from '@/lib/constants';
import {
  getRecentlyActivePages,
  getTrendingPages,
  type ExplorePageRow,
} from '@/lib/pages';
import { isSupabaseConfigured } from '@/lib/supabase';

export type ExploreMode = 'trending' | 'new';

function hostFromCanonical(canonicalUrl: string): string {
  return canonicalize(`https://${canonicalUrl}`).host || canonicalUrl;
}

export function ExploreTab() {
  const { t, locale } = useLocale();
  const [mode, setMode] = useState<ExploreMode>('trending');
  const [rows, setRows] = useState<ExplorePageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!isSupabaseConfigured) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const load =
      mode === 'trending'
        ? getTrendingPages(TRENDING_LIMIT).then((data) =>
            (data as ExplorePageRow[]).map((row) => ({
              ...row,
              url: row.url ?? null,
              last_active_at: row.last_active_at ?? null,
              message_count: row.message_count ?? 0,
            })),
          )
        : getRecentlyActivePages(TRENDING_LIMIT);

    load
      .then((data) => {
        if (!cancelled) setRows(data);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [mode]);

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

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4 pt-3">
        {loading &&
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="mb-1 h-14 w-full" />
          ))}
        {!loading && rows.length === 0 && (
          <p className="px-1 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            {mode === 'trending' ? t('explore.emptyTrending') : t('explore.emptyNew')}
          </p>
        )}
        {!loading &&
          rows.map((row) => {
            const host = hostFromCanonical(row.canonical_url);
            const showOnline = !(mode === 'new' && row.last_active_at);
            const activity = showOnline
              ? t('auth.trendingTalking', { count: row.message_count })
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
                      showOnline
                        ? 'mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-success)]'
                        : 'mt-0.5 text-[11px] text-[var(--color-muted-foreground)]'
                    }
                  >
                    {showOnline ? (
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
      </div>
    </div>
  );
}
