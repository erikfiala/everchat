import { useEffect, useRef, type RefObject } from 'react';

/**
 * Observe a bottom sentinel inside a scroll parent (sidepanel lists).
 * Fires `onLoadMore` when the sentinel is near the visible edge.
 */
export function useListSentinel(
  enabled: boolean,
  onLoadMore: () => void,
  rootRef?: RefObject<Element | null>,
  /** Re-check intersection after the list grows (short lists stay intersecting). */
  reobserveKey?: unknown,
) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  onLoadMoreRef.current = onLoadMore;

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !enabled) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          onLoadMoreRef.current();
        }
      },
      { root: rootRef?.current ?? null, rootMargin: '160px', threshold: 0 },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, [enabled, rootRef, reobserveKey]);

  return sentinelRef;
}
