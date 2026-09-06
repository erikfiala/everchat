import { describe, expect, it } from 'vitest';
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

  it('uses long-form date-fns distances with a suffix', () => {
    expect(formatRelativeTime(ago(60_000), now)).toBe('1 minute ago');
    expect(formatRelativeTime(ago(7 * 60_000), now)).toBe('7 minutes ago');
    expect(formatRelativeTime(ago(5 * 3_600_000), now)).toBe('about 5 hours ago');
    expect(formatRelativeTime(ago(24 * 3_600_000), now)).toBe('1 day ago');
  });
});
