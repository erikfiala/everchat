import { describe, expect, it } from 'vitest';
import { EMOJI_ITEMS, searchEmoji } from './emoji';

describe('searchEmoji', () => {
  it('includes a searchable full set with smileys first', () => {
    expect(EMOJI_ITEMS.length).toBeGreaterThan(1500);
    expect(EMOJI_ITEMS[0]?.emoji).toBe('😀');
  });

  it('matches labels, tags, and shortcodes', () => {
    const grinning = searchEmoji('grinning face');
    expect(grinning.some((item) => item.emoji === '😀')).toBe(true);
    expect(searchEmoji('fire').some((item) => item.emoji === '🔥')).toBe(true);
  });

  it('returns no rows for an unknown query', () => {
    expect(searchEmoji('xyznotanemoji123')).toEqual([]);
  });
});
