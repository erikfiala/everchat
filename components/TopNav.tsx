import { Bell, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelTab } from '@/lib/database.types';
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

const tabs: { id: PanelTab; label: string; icon: typeof MessageCircle }[] = [
  { id: 'chat', label: 'Chat', icon: MessageCircle },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
];

export function TopNav({ active, onChange, unread = 0 }: TopNavProps) {
  const { resolved } = useTheme();
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="flex items-center justify-between gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5">
        <button
          type="button"
          onClick={() => onChange('chat')}
          className="flex shrink-0 items-center rounded-md py-1 pr-1"
          aria-label="Everchat, Chat"
        >
          <img
            src={
              resolved === 'dark'
                ? '/ec-logo-horizontal-white.svg'
                : '/ec-logo-horizontal-black.svg'
            }
            alt="Everchat"
            width="120"
            height="28"
            className="h-5 w-auto pb-[4px]"
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
                      'relative box-border flex h-7 w-7 shrink-0 items-center justify-center rounded-md p-0 leading-none transition-colors',
                      isActive
                        ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                        : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]',
                    )}
                    aria-label={label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <Icon className="size-4" />
                    {id === 'notifications' && unread > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-[var(--color-destructive)] px-0.5 text-[9px] font-semibold text-white">
                        {unread > 99 ? '99+' : unread}
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
