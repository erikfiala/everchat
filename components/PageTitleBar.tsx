import type { HTMLAttributes } from 'react';
import { PageTitle } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

/** Same height/padding/border as Explore's filter bar, TopNav, and chat chrome. */
export const PAGE_NAV_BAR_CLASS =
  'flex min-h-14 shrink-0 items-center gap-2 border-b border-[var(--color-border)] px-3 py-2';

export function PageTitleBar({
  children,
  className,
  ...props
}: HTMLAttributes<HTMLElement>) {
  return (
    <header className={cn(PAGE_NAV_BAR_CLASS, className)} {...props}>
      <PageTitle>{children}</PageTitle>
    </header>
  );
}
