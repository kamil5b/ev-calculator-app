import { cn } from '../../../lib/utils';
import type { ComponentChildren, JSX } from 'preact';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'destructive' | 'outline';

export type BadgeProps = JSX.HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
  children?: ComponentChildren;
};

/** Status pill, e.g. the low-battery warning from PRD 5.2. */
export function Badge({ class: className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      class={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap',
        VARIANTS[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}

const VARIANTS: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-amber-100 text-amber-900',
  destructive: 'bg-red-100 text-red-800',
  outline: 'border border-slate-300 text-slate-700',
};
