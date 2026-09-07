import { formatDistance, type Locale } from 'date-fns';
import { dateFnsLocaleFor } from './dateFnsLocale';

const MINUTE_MS = 60_000;

export type FormatRelativeTimeOptions = {
  locale?: Locale | string;
  lessThanMinute?: string;
};

/** Long-form relative time; under a minute is sentence-cased. */
export function formatRelativeTime(
  date: Date,
  now: Date = new Date(),
  options?: FormatRelativeTimeOptions,
): string {
  const ms = Math.abs(now.getTime() - date.getTime());
  if (ms < MINUTE_MS) {
    return options?.lessThanMinute ?? 'Less than a minute ago';
  }
  const locale =
    typeof options?.locale === 'string'
      ? dateFnsLocaleFor(options.locale)
      : options?.locale;
  return formatDistance(date, now, { addSuffix: true, locale });
}

/** Bind locale + under-a-minute copy for `safeRelativeTime`. */
export function bindRelativeTime(
  localeCode: string,
  lessThanMinute: string,
): (date: Date) => string {
  const locale = dateFnsLocaleFor(localeCode);
  return (date: Date) =>
    formatRelativeTime(date, new Date(), { locale, lessThanMinute });
}
