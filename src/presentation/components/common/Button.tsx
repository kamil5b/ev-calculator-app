import { cn } from '../../../lib/utils';
import type { JSX } from 'preact';

export type ButtonVariant = 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

export type ButtonProps = JSX.HTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the single-child spinner treatment and blocks interaction. */
  loading?: boolean;
};

/**
 * Touch target of 44px satisfies the WCAG minimum from PRD 5.3; focus styling
 * uses `focus-visible` so pointer users do not see a ring on click.
 */
const VARIANTS: Record<ButtonVariant, string> = {
  default: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950',
  secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
  outline: 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50',
  ghost: 'text-slate-700 hover:bg-slate-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-11 px-4 text-base',
  lg: 'min-h-12 px-6 text-base',
};

export function Button({
  class: className,
  variant = 'default',
  size = 'md',
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
      class={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors',
        'focus-visible:ring-slate-900 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
