import type { HTMLAttributes, ReactNode } from 'react';
import { PageTitle } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

/** Same height/padding/border as Explore's filter bar, TopNav, and chat chrome. */
export const PAGE_NAV_BAR_CLASS =
  'flex min-h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2';

export function PageTitleBar({
  children,
  action,
  className,
  ...props
}: HTMLAttributes<HTMLElement> & { action?: ReactNode }) {
  return (
    <header className={cn(PAGE_NAV_BAR_CLASS, className)} {...props}>
      <PageTitle className="-translate-y-px min-w-0 truncate">{children}</PageTitle>
      {action ? (
        <div className="ms-auto flex shrink-0 items-center gap-2">{action}</div>
      ) : null}
    </header>
  );
}
