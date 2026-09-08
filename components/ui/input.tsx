import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      // h-9 + py-0 + leading-tight: descenders (g/y/p) stay visible; flex
      // height still optically centers text (py-* + default leading sits low).
      'flex h-9 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-0 text-sm leading-tight transition-colors placeholder:text-[var(--color-muted-foreground)] disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = 'Input';
