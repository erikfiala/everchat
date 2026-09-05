import { Globe } from 'lucide-react';
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
  return (
    <div
      className={cn(
        'flex w-full min-w-0 items-center gap-2 overflow-hidden border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2',
        className,
      )}
    >
      {faviconUrl ? (
        <img
          src={faviconUrl}
          alt=""
          className="h-4 w-4 shrink-0 rounded-sm"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
      ) : (
        <Globe className="h-4 w-4 shrink-0 text-[var(--color-muted-foreground)]" />
      )}
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="truncate text-sm font-medium">
          {title || host || 'This page'}
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
