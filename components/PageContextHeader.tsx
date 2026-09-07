import { Favicon } from '@/components/Favicon';
import { useLocale } from '@/hooks/useLocale';
import { cn } from '@/lib/utils';

interface PageContextHeaderProps {
  title?: string | null;
  host?: string | null;
  faviconUrl?: string | null;
  className?: string;
}

export function PageContextHeader({
  title,
  host,
  faviconUrl,
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
          <div className="truncate text-xs text-[var(--color-muted-foreground)]">
            {host}
          </div>
        )}
      </div>
    </div>
  );
}
