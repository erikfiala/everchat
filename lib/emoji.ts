import catalog from './emoji-catalog.json';

/** Slim row: [emoji, English label, search tags/shortcodes/emoticons]. */
type CatalogRow = [emoji: string, label: string, tags: string];

export type EmojiItem = {
  emoji: string;
  label: string;
  haystack: string;
};

/**
 * Bundled Unicode set derived from emojibase-data (en compact + shortcodes).
 * Skin-tone/hair components and regional-indicator letters are omitted.
 * Do not fetch emoji CDNs at runtime — extension CSP forbids it.
 */
export const EMOJI_ITEMS: EmojiItem[] = (catalog as CatalogRow[]).map(
  ([emoji, label, tags]) => ({
    emoji,
    label,
    haystack: `${label} ${tags} ${emoji}`.toLowerCase(),
  }),
);

export function searchEmoji(query: string): EmojiItem[] {
  const tokens = query
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  if (tokens.length === 0) return EMOJI_ITEMS;
  return EMOJI_ITEMS.filter((item) =>
    tokens.every((token) => item.haystack.includes(token)),
  );
}
