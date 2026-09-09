import { useEffect, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { cn } from '@/lib/utils';

interface FaviconProps {
  src?: string | null;
  className?: string;
}

/** Page/room favicon with a themed globe fallback when missing or broken. */
export function Favicon({ src, className }: FaviconProps) {
  const [status, setStatus] = useState<'pending' | 'ok' | 'err'>('pending');

  useEffect(() => {
    setStatus('pending');
  }, [src]);

  const fallback = (
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

  if (!src || status === 'err') {
    return fallback;
  }

  return (
    <>
      {status !== 'ok' && fallback}
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        decoding="async"
        className={cn(
          'h-4 w-4 shrink-0',
          className,
          status !== 'ok' && 'hidden',
        )}
        onLoad={() => setStatus('ok')}
        onError={() => setStatus('err')}
      />
    </>
  );
}
