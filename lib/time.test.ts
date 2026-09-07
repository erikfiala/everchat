import { describe, expect, it } from 'vitest';
import { de } from 'date-fns/locale/de';
import { formatRelativeTime } from './time';

const now = new Date('2026-09-06T12:00:00.000Z');

function ago(ms: number): Date {
  return new Date(now.getTime() - ms);
}

describe('formatRelativeTime', () => {
  it('uses sentence-cased less than a minute ago under a minute', () => {
    expect(formatRelativeTime(now, now)).toBe('Less than a minute ago');
    expect(formatRelativeTime(ago(20_000), now)).toBe('Less than a minute ago');
    expect(formatRelativeTime(ago(59_000), now)).toBe('Less than a minute ago');
  });

  it('uses an i18n under-a-minute string when provided', () => {
    expect(
      formatRelativeTime(now, now, { lessThanMinute: 'Vor weniger als einer Minute' }),
    ).toBe('Vor weniger als einer Minute');
  });

  it('uses long-form date-fns distances with a suffix', () => {
    expect(formatRelativeTime(ago(60_000), now)).toBe('1 minute ago');
    expect(formatRelativeTime(ago(7 * 60_000), now)).toBe('7 minutes ago');
    expect(formatRelativeTime(ago(5 * 3_600_000), now)).toBe('about 5 hours ago');
    expect(formatRelativeTime(ago(24 * 3_600_000), now)).toBe('1 day ago');
  });

  it('passes a date-fns locale through', () => {
    expect(formatRelativeTime(ago(60_000), now, { locale: de })).toBe(
      'vor 1 Minute',
    );
    expect(formatRelativeTime(ago(60_000), now, { locale: 'de' })).toBe(
      'vor 1 Minute',
    );
  });
});
