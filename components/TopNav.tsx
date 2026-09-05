import { Bell, MessageSquare, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PanelTab } from '@/lib/database.types';
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

const tabs: { id: PanelTab; label: string; icon: typeof MessageSquare }[] = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'notifications', label: 'Notifications', icon: Bell },
  { id: 'profile', label: 'Profile', icon: User },
];

export function TopNav({ active, onChange, unread = 0 }: TopNavProps) {
  return (
    <TooltipProvider delayDuration={200}>
      <nav className="flex items-center justify-around border-b border-[var(--color-border)] bg-white px-2 py-1.5">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = active === id;
          return (
            <Tooltip key={id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => onChange(id)}
                  className={cn(
                    'relative flex h-10 w-12 items-center justify-center rounded-md transition-colors',
                    isActive
                      ? 'bg-[var(--color-muted)] text-[var(--color-foreground)]'
                      : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-accent)]',
                  )}
                  aria-label={label}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <Icon className="h-5 w-5" />
                  {id === 'notifications' && unread > 0 && (
                    <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-destructive)] px-1 text-[10px] font-semibold text-white">
                      {unread > 99 ? '99+' : unread}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          );
        })}
      </nav>
    </TooltipProvider>
  );
}
