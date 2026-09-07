import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors aria-disabled:opacity-50 aria-disabled:hover:opacity-50',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] hover:opacity-90',
        secondary:
          'bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-accent)]',
        ghost: 'hover:bg-[var(--color-accent)]',
        outline:
          'border border-[var(--color-border)] bg-transparent hover:bg-[var(--color-accent)]',
        destructive:
          'bg-[var(--color-destructive)] text-white hover:opacity-90',
        link: 'text-[var(--color-foreground)] underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-4 py-2',
        sm: 'h-8 rounded-md px-3',
        xs: 'h-7 rounded-md px-2.5 leading-none',
        lg: 'h-10 rounded-md px-6',
        icon: 'h-9 w-9',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      disabled = false,
      onClick,
      onKeyDown,
      tabIndex,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        {...props}
        className={cn(
          buttonVariants({ variant, size }),
          className,
          // Exclusive class: `cursor-pointer` must not stay on disabled, or it
          // wins the cascade. Native `disabled` is omitted so hover can set
          // cursor (Chromium/WebKit ignore `cursor` on :disabled controls).
          disabled ? 'cursor-not-allowed' : 'cursor-pointer',
        )}
        ref={ref}
        aria-disabled={disabled || undefined}
        tabIndex={disabled ? -1 : tabIndex}
        onClick={(event) => {
          if (disabled) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onClick?.(event);
        }}
        onKeyDown={(event) => {
          if (disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          onKeyDown?.(event);
        }}
      />
    );
  },
);
Button.displayName = 'Button';
