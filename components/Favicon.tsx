import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/ui/icon';
import { faviconSrcCandidates } from '@/lib/favicon';
import { cn } from '@/lib/utils';

interface FaviconProps {
  src?: string | null;
  className?: string;
}

/** Page/room favicon with a themed globe fallback when missing or broken. */
export function Favicon({ src, className }: FaviconProps) {
  const candidates = useMemo(() => faviconSrcCandidates(src), [src]);
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<'pending' | 'ok' | 'err'>('pending');

  useEffect(() => {
    setIndex(0);
    setStatus('pending');
  }, [src]);

  const current = candidates[index];

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

  if (!current || status === 'err') {
    return fallback;
  }

  return (
    <>
      {status !== 'ok' && fallback}
      <img
        src={current}
        alt=""
        referrerPolicy="no-referrer"
        decoding="async"
        className={cn(
          'h-4 w-4 shrink-0',
          className,
          status !== 'ok' && 'hidden',
        )}
        onLoad={() => setStatus('ok')}
        onError={() => {
          if (index + 1 < candidates.length) {
            setIndex(index + 1);
            setStatus('pending');
            return;
          }
          setStatus('err');
        }}
      />
    </>
  );
}
