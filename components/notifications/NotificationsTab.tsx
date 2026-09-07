import { useRef } from 'react';
import { Favicon } from '@/components/Favicon';
import { ListSentinel } from '@/components/ListSentinel';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useListSentinel } from '@/hooks/useListSentinel';
import { useLocale } from '@/hooks/useLocale';
import { useNotifications } from '@/hooks/useNotifications';
import { DESCRIPTION_TRUNCATE } from '@/lib/constants';
import { safeRelativeTime } from '@/lib/collapse';
import { bindRelativeTime } from '@/lib/time';
import { cn } from '@/lib/utils';

export function NotificationsTab() {
  const { t, locale } = useLocale();
  const formatTime = bindRelativeTime(locale, t('time.lessThanMinute'));
  const { user, loading: authLoading } = useAuth();
  const { items, loading, loadingMore, hasMore, loadMore, openNotification } =
    useNotifications();
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useListSentinel(
    hasMore && !loading,
    () => {
      void loadMore();
    },
    scrollRef,
    items.length,
  );

  if (authLoading) {
    return (
      <div className="space-y-2 p-3">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (!user) return <AuthLanding />;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto pt-1">
        {loading && items.length === 0 && (
          <div className="space-y-2 p-3 pt-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            {t('notifications.empty')}
          </p>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => openNotification(n)}
            className={cn(
              'flex w-full items-start gap-2 border-b border-[var(--color-border)] px-3 py-3 text-start hover:bg-[var(--color-accent)]',
              !n.read_at && 'bg-[var(--color-muted)]/60',
            )}
          >
            <Favicon src={n.page?.favicon_url} className="mt-0.5" />
            <div className="min-w-0 flex-1 overflow-hidden">
              <div className="truncate text-sm font-medium">
                {n.page?.title || n.page?.canonical_url || t('common.page')}
              </div>
              <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                {(
                  n.page?.description ||
                  n.page?.canonical_url ||
                  ''
                ).slice(0, DESCRIPTION_TRUNCATE)}
              </div>
              <div className="mt-1 truncate text-xs">
                <span className="font-medium">@{n.actor?.username}</span>
                <span className="text-[var(--color-muted-foreground)]">
                  {' '}
                  {t('notifications.replied', {
                    preview: n.body_preview ?? '',
                  })}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                {safeRelativeTime(n.created_at, formatTime)}
              </div>
            </div>
          </button>
        ))}
        {hasMore ? (
          <ListSentinel sentinelRef={sentinelRef} loading={loadingMore} />
        ) : null}
      </div>
    </div>
  );
}
