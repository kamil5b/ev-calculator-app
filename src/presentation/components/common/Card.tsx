import { cn } from '../../../lib/utils';
import type { ComponentChildren, JSX } from 'preact';

export type CardProps = JSX.HTMLAttributes<HTMLDivElement> & {
  children?: ComponentChildren;
};

/** Bordered surface used to group inputs and outputs. */
export function Card({ class: className, children, ...props }: CardProps) {
  return (
    <div
      class={cn('rounded-xl border border-slate-200 bg-white shadow-sm', className)}
      {...props}
    >
      {children}
    </div>
  );
}

/** Uppercase section heading inside a {@link Card}. */
export function CardHeader({ class: className, children, ...props }: CardProps) {
  return (
    <div class={cn('flex flex-col gap-1 px-4 pt-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ class: className, children, ...props }: CardProps) {
  return (
    <h2
      class={cn('text-sm font-semibold tracking-wide text-slate-500 uppercase', className)}
      {...props}
    >
      {children}
    </h2>
  );
}

export function CardDescription({ class: className, children, ...props }: CardProps) {
  return <p class={cn('text-sm text-slate-500', className)} {...props}>{children}</p>;
}

/** Body region; `space-y` handles the vertical rhythm of stacked fields. */
export function CardContent({ class: className, children, ...props }: CardProps) {
  return (
    <div class={cn('space-y-4 px-4 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ class: className, children, ...props }: CardProps) {
  return (
    <div class={cn('flex items-center gap-3 px-4 pb-4', className)} {...props}>
      {children}
    </div>
  );
}
