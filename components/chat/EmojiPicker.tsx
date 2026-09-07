import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/hooks/useLocale';
import { searchEmoji } from '@/lib/emoji';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
}

export function EmojiPicker({ onSelect }: EmojiPickerProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState('');
  const results = useMemo(() => searchEmoji(query), [query]);

  return (
    <div className="absolute start-0 end-0 bottom-full z-30 mx-2 mb-3 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-1 py-2 shadow-lg">
      <div className="px-1">
        <Input
          placeholder={t('composer.searchEmoji')}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>
      <div className="mt-2 grid max-h-72 min-h-32 grid-cols-8 gap-1 overflow-y-auto">
        {results.length === 0 ? (
          <p
            role="status"
            className="col-span-8 flex min-h-32 items-center justify-center px-2 text-center text-sm text-[var(--color-muted-foreground)]"
          >
            {t('composer.emojiNoResults')}
          </p>
        ) : (
          results.map((item) => (
            <button
              key={item.emoji}
              type="button"
              title={item.label}
              aria-label={item.label}
              className="flex aspect-square cursor-pointer items-center justify-center rounded text-xl leading-none transition-colors hover:bg-[var(--color-accent)]"
              onClick={() => onSelect(item.emoji)}
            >
              {item.emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
