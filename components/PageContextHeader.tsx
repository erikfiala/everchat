import { Favicon } from '@/components/Favicon';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

interface PageContextHeaderProps {
  title?: string | null;
  host?: string | null;
  faviconUrl?: string | null;
  isCurrentPage?: boolean;
  className?: string;
}

export function PageContextHeader({
  title,
  host,
  faviconUrl,
  isCurrentPage = false,
  className,
}: PageContextHeaderProps) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        'flex min-h-14 w-full min-w-0 items-center gap-2 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2',
        className,
      )}
    >
      <Favicon src={faviconUrl} />
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">
          {title || host || t('page.thisPage')}
        </div>
        {host && (
          <div className="inline-flex min-w-0 max-w-full items-baseline gap-0.5 text-xs text-[var(--color-muted-foreground)]">
            <span className="truncate mr-px">{host}</span>
            {isCurrentPage && (
              <>
                <span aria-hidden className="shrink-0">·</span>
                <span className="shrink-0" data-current-page="">{t('page.thisPage')}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
