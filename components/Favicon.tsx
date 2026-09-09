import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface FaviconProps {
  src?: string | null;
  className?: string;
}

/** Page/room favicon with a themed globe fallback when missing or broken. */
export function Favicon({ src, className }: FaviconProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (!src || failed) {
    return (
      <Icon
        name="globe"
        width={16}
        height={16}
        className={cn(
          'size-4 shrink-0 text-[var(--color-muted-foreground)]',
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <img
      src={src}
      alt=""
      className={cn('h-4 w-4 shrink-0', className)}
      onError={() => setFailed(true)}
    />
  );
}
