import { formatDistanceToNow } from 'date-fns';
import { Globe } from 'lucide-react';
import { AuthLanding } from '@/components/auth/AuthLanding';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { DESCRIPTION_TRUNCATE } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function NotificationsTab() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading, openNotification } = useNotifications(user?.id);

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
      <div className="border-b border-[var(--color-border)] px-3 py-2">
        <h1 className="text-sm font-semibold">Notifications</h1>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-2 p-3">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        )}
        {!loading && items.length === 0 && (
          <p className="px-4 py-10 text-center text-sm text-[var(--color-muted-foreground)]">
            No replies yet. When someone responds, it’ll show up here.
          </p>
        )}
        {items.map((n) => (
          <button
            key={n.id}
            type="button"
            onClick={() => openNotification(n)}
            className={cn(
              'flex w-full items-start gap-2 border-b border-[var(--color-border)] px-3 py-3 text-left hover:bg-[var(--color-accent)]',
              !n.read_at && 'bg-[var(--color-muted)]/60',
            )}
          >
            {n.page?.favicon_url ? (
              <img
                src={n.page.favicon_url}
                alt=""
                className="mt-0.5 h-4 w-4 shrink-0"
              />
            ) : (
              <Globe className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">
                {n.page?.title || n.page?.canonical_url || 'Page'}
              </div>
              <div className="truncate text-xs text-[var(--color-muted-foreground)]">
                {(
                  n.page?.description ||
                  n.page?.canonical_url ||
                  ''
                ).slice(0, DESCRIPTION_TRUNCATE)}
              </div>
              <div className="mt-1 text-xs">
                <span className="font-medium">@{n.actor?.username}</span>
                <span className="text-[var(--color-muted-foreground)]">
                  {' '}
                  replied · {n.body_preview}
                </span>
              </div>
              <div className="mt-0.5 text-[11px] text-[var(--color-muted-foreground)]">
                {formatDistanceToNow(new Date(n.created_at), {
                  addSuffix: true,
                })}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
