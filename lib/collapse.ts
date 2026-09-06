import { COLLAPSE_DOWNVOTE_RATIO, COLLAPSE_MIN_VOTES } from './constants';

export function isCommunityCollapsed(
  upvotes: number,
  downvotes: number,
): boolean {
  const total = upvotes + downvotes;
  if (total < COLLAPSE_MIN_VOTES) return false;
  return downvotes / total >= COLLAPSE_DOWNVOTE_RATIO;
}

export function scoreColorClass(score: number): string {
  if (score > 0) return 'text-[var(--color-score-pos)]';
  if (score < 0) return 'text-[var(--color-score-neg)]';
  return 'text-[var(--color-muted-foreground)]';
}

export function formatScore(score: number): string {
  if (score > 0) return `+${score}`;
  return String(score);
}

/** date-fns throws on Invalid Date — guard message/activity timestamps. */
export function safeRelativeTime(
  iso: string | null | undefined,
  format: (date: Date) => string,
  fallback = '',
): string {
  if (!iso) return fallback;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return fallback;
  try {
    return format(date);
  } catch {
    return fallback;
  }
}
