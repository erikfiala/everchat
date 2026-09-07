import { Bell, Compass, MessageCircle, Settings, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelTab } from '@/lib/database.types';
import { useLocale } from '@/hooks/useLocale';
import { useTheme } from '@/hooks/useTheme';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface TopNavProps {
  active: PanelTab;
  onChange: (tab: PanelTab) => void;
  unread?: number;
}

export function TopNav({ active, onChange, unread = 0 }: TopNavProps) {
  const { resolved } = useTheme();
  const { t } = useLocale();

  const tabs: { id: PanelTab; label: string; icon: typeof MessageCircle }[] = [
    { id: 'chat', label: t('nav.chat'), icon: MessageCircle },
    { id: 'explore', label: t('nav.explore'), icon: Compass },
    { id: 'leaderboard', label: t('nav.leaderboard'), icon: Trophy },
    { id: 'notifications', label: t('nav.notifications'), icon: Bell },
    { id: 'profile', label: t('nav.profile'), icon: User },
    { id: 'settings', label: t('nav.settings'), icon: Settings },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <nav className="flex min-h-14 items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2">
        <button
          type="button"
          onClick={() => onChange('chat')}
          className="flex shrink-0 items-center rounded-md py-1 pe-1"
          aria-label={t('nav.brandChat')}
        >
          <img
            src={
              resolved === 'dark'
                ? '/ec-logo-horizontal-white.svg'
                : '/ec-logo-horizontal-black.svg'
            }
            alt={t('nav.brandAlt')}
            width="120"
            height="28"
            className="h-6 w-auto pb-[4px]"
          />
        </button>

        <div className="flex items-center gap-0.5">
          {tabs.map(({ id, label, icon: Icon }) => {
            const isActive = active === id;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onChange(id)}
                    className={cn(
                      'relative box-border flex size-8 shrink-0 items-center justify-center rounded-md p-0 leading-none transition-colors',
                      isActive
                        ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]',
                    )}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="size-4" />
                    {id === 'notifications' && unread > 0 && (
                      <span className="absolute -end-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-destructive)] px-0.5 text-[9px] font-semibold text-white">
                        {unread > 99 ? t('nav.unreadOverflow') : unread}
                      </span>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>{label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </nav>
    </TooltipProvider>
  );
}
