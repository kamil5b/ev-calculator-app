import { cn } from '../../../lib/utils';
import type { ComponentChildren, JSX } from 'preact';

export type SelectOption = {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
};

export type SelectProps = Omit<JSX.HTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> & {
  label: string;
  value: string;
  options: readonly SelectOption[];
  error?: string;
  hint?: string;
  onValueChange: (value: string) => void;
  children?: ComponentChildren;
};

/**
 * Native `<select>` styled to match the inputs.
 *
 * Native is preferred over a custom listbox: on mobile it opens the platform
 * picker, and on desktop it inherits type-ahead and screen-reader support.
 */
export function Select({
  label,
  value,
  options,
  error,
  hint,
  class: className,
  onValueChange,
  ...props
}: SelectProps) {
  const selectId = `select-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
  const describedBy = error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined;

  const handleChange = (event: JSX.TargetedEvent<HTMLSelectElement, Event>) => {
    onValueChange((event.currentTarget as HTMLSelectElement).value);
  };

  return (
    <div class={cn('space-y-1.5', className)}>
      <label class="block text-sm font-medium text-slate-700" for={selectId}>
        {label}
      </label>

      <select
        id={selectId}
        value={value}
        aria-label={label}
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        class={cn(
          'min-h-11 w-full appearance-none rounded-lg border bg-white bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat px-3 py-2 pr-10 text-base text-slate-900',
          'focus-visible:ring-slate-900 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
          error ? 'border-red-500' : 'border-slate-300',
        )}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        }}
        onChange={handleChange}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>

      {error ? (
        <p id={`${selectId}-error`} class="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={`${selectId}-hint`} class="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
