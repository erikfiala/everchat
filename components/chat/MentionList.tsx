import { useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useLocale } from '@/hooks/useLocale';
import type { MentionParticipant } from '@/lib/mentions';
import { cn } from '@/lib/utils';

interface MentionListProps {
  items: MentionParticipant[];
  activeIndex: number;
  onHover: (index: number) => void;
  onSelect: (item: MentionParticipant) => void;
}

export function MentionList({
  items,
  activeIndex,
  onHover,
  onSelect,
}: MentionListProps) {
  const { t } = useLocale();
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <div
      id="ec-mention-list"
      role="listbox"
      aria-label={t('composer.mentionListLabel')}
      className="absolute start-0 bottom-full z-40 mb-1 max-h-48 w-full max-w-[16rem] overflow-y-auto rounded-md border border-[var(--color-border)] bg-[var(--color-card)] py-1 shadow-md"
    >
      {items.length === 0 ? (
        <p
          role="status"
          className="px-2.5 py-2 text-sm text-[var(--color-muted-foreground)]"
        >
          {t('composer.mentionNoResults')}
        </p>
      ) : (
        items.map((item, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={item.username}
              ref={active ? activeRef : undefined}
              type="button"
              id={`ec-mention-${item.username}`}
              role="option"
              aria-selected={active}
              className={cn(
                'flex w-full cursor-pointer items-center gap-2 px-2.5 py-1.5 text-start text-sm outline-none',
                active && 'bg-[var(--color-accent)]',
              )}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => onHover(index)}
              onClick={() => onSelect(item)}
            >
              <Avatar className="h-6 w-6">
                {item.avatarUrl && <AvatarImage src={item.avatarUrl} />}
                <AvatarFallback>
                  {item.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="truncate font-medium">@{item.username}</span>
            </button>
          );
        })
      )}
    </div>
  );
}
