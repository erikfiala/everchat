import type { RefObject } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function ListSentinel({
  sentinelRef,
  loading,
  className,
}: {
  sentinelRef: RefObject<HTMLDivElement | null>;
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      ref={sentinelRef}
      className={className}
      aria-hidden={!loading}
    >
      {loading ? <Skeleton className="my-2 h-10 w-full" /> : (
        <div className="h-1 w-full" />
      )}
    </div>
  );
}
