import { useEffect, useState } from 'react';
import { Globe } from 'lucide-react';
import { getTrendingPages } from '@/lib/pages';
import { isSupabaseConfigured } from '@/lib/supabase';
import { httpsUrlFromCanonical } from '@/lib/canonicalize';
import { DESCRIPTION_TRUNCATE, TRENDING_LIMIT } from '@/lib/constants';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/hooks/useLocale';

interface TrendingRow {
  id: string;
  canonical_url: string;
  title: string | null;
  description: string | null;
  favicon_url: string | null;
  message_count: number;
}

/** Compact trending list for AuthLanding social proof (logged-out dopamine). */
export function TrendingChats() {
  const { t } = useLocale();
  const [rows, setRows] = useState<TrendingRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    getTrendingPages(TRENDING_LIMIT)
      .then((data) => setRows(data as TrendingRow[]))
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, []);

  if (!loading && rows.length === 0) return null;

  const open = async (row: TrendingRow) => {
    const url = httpsUrlFromCanonical(row.canonical_url);
    const tab = await browser.tabs.create({ url });
    if (tab.id != null) {
      await browser.runtime.sendMessage({
        type: 'OPEN_PANEL_FOR_TAB',
        tabId: tab.id,
      });
    }
  };

  return (
    <section className="mt-6">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">
        {t('auth.trendingChats')}
      </h2>
      <div className="flex flex-col gap-1">
        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        {!loading &&
          rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => open(row)}
              className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-start hover:bg-[var(--color-accent)]"
            >
              {row.favicon_url ? (
                <img
                  src={row.favicon_url}
                  alt=""
                  className="mt-0.5 h-4 w-4 shrink-0"
                />
              ) : (
                <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
              )}
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="truncate text-sm font-medium">
                  {row.title || row.canonical_url}
                </div>
                <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                  {(row.description || row.canonical_url).slice(
                    0,
                    DESCRIPTION_TRUNCATE,
                  )}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                  {t('auth.trendingTalking', { count: row.message_count })}
                </div>
              </div>
            </button>
          ))}
      </div>
    </section>
  );
}
