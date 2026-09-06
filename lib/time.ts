import { formatDistance } from 'date-fns';

const MINUTE_MS = 60_000;

/** Long-form relative time; under a minute is sentence-cased. */
export function formatRelativeTime(
  date: Date,
  now: Date = new Date(),
): string {
  const ms = Math.abs(now.getTime() - date.getTime());
  if (ms < MINUTE_MS) return 'Less than a minute ago';
  return formatDistance(date, now, { addSuffix: true });
}
