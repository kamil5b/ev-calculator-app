import { cn } from '../../../lib/utils';
import type { ComponentChildren, JSX } from 'preact';

export type LabelProps = JSX.HTMLAttributes<HTMLLabelElement> & {
  children?: ComponentChildren;
  required?: boolean;
};

/**
 * Standalone form label.
 *
 * Fields that own their label (see `Input`, `Slider`, `Select`) render it
 * internally; this exists for standalone use such as the radio-style car picker.
 */
export function Label({ class: className, required, children, ...props }: LabelProps) {
  return (
    <label class={cn('block text-sm font-medium text-slate-700', className)} {...props}>
      {children}
      {required === true && (
        <span class="ml-0.5 text-red-600" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
