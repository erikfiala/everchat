import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/** Same size/weight as DialogTitle (ProfileSheet heading). */
export const PAGE_TITLE_CLASS = 'text-base font-semibold leading-tight';

/** Form field label — muted, smaller than the control value. */
export const FIELD_LABEL_CLASS =
  'mb-1 block text-xs font-semibold text-[var(--color-muted-foreground)]';

export function PageTitle({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return <h1 className={cn(PAGE_TITLE_CLASS, className)} {...props} />;
}
