import { cn } from '../../../lib/utils';
import type { ComponentChildren, JSX } from 'preact';

export type InputProps = Omit<
  JSX.IntrinsicElements['input'],
  // `size` collides with our variant sizing; native handlers would silently not
  // be forwarded, so callers use `onValueChange` instead.
  'size' | 'onInput' | 'onChange'
> & {
  /** Visible label text. Renders nothing when omitted (aria-label is then required). */
  label?: string;
  /** Inline validation message; also wires `aria-invalid` and `aria-describedby`. */
  error?: string;
  /** Static hint rendered under the control when there is no error. */
  hint?: string;
  /** Trailing unit, e.g. `"kWh"`. */
  unit?: string;
  /** Quick-pick values rendered as chips beneath the control. */
  presets?: readonly number[];
  /** Accessible name when no visible label is provided. */
  ariaLabel?: string;
  containerClassName?: string;
  onValueChange?: (value: string) => void;
  children?: ComponentChildren;
};

/**
 * Renders an optional numeric field value: blank for `null` or a half-typed
 * `NaN`, and at most two decimals so a unit conversion never shows float noise.
 */
export function toFieldValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return '';
  return String(Number(value.toFixed(2)));
}

/** Parses an optional numeric field: blank → `null`, anything else → `Number`. */
export function fromFieldValue(value: string): number | null {
  return value.trim() === '' ? null : Number(value);
}

let counter = 0;

function nextId(): string {
  counter += 1;
  return `field-${counter}`;
}

/**
 * Labelled text/number field with inline validation.
 *
 * Accessibility notes: the label is always associated with the control via
 * `htmlFor`, the error is linked through `aria-describedby`, and `aria-invalid`
 * flips when validation fails, so screen readers announce the state without the
 * user needing to hunt for the red text.
 */
export function Input({
  class: className,
  containerClassName,
  label,
  error,
  hint,
  unit,
  presets,
  ariaLabel,
  id,
  onValueChange,
  ...props
}: InputProps) {
  const fieldId = id ?? nextId();
  const describedBy = error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined;

  const handleChange = (event: JSX.TargetedInputEvent<HTMLInputElement>) => {
    onValueChange?.(event.currentTarget.value);
  };

  return (
    <div class={cn('space-y-1.5', containerClassName)}>
      {label !== undefined && (
        <label class="block text-sm font-medium text-slate-700" for={fieldId}>
          {label}
        </label>
      )}

      <div class="relative">
        <input
          id={fieldId}
          aria-label={label === undefined ? ariaLabel : undefined}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          class={cn(
            'min-h-11 w-full rounded-lg border bg-white px-3 py-2 text-base text-slate-900',
            'placeholder:text-slate-400',
            'focus-visible:ring-slate-900 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400',
            unit !== undefined ? 'pr-14' : undefined,
            error ? 'border-red-500' : 'border-slate-300',
            className,
          )}
          onInput={handleChange}
          onChange={handleChange}
          {...props}
        />
        {unit !== undefined && (
          <span
            class="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-slate-500"
            aria-hidden="true"
          >
            {unit}
          </span>
        )}
      </div>

      {error ? (
        <p id={`${fieldId}-error`} class="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : hint !== undefined ? (
        <p id={`${fieldId}-hint`} class="text-sm text-slate-500">
          {hint}
        </p>
      ) : null}

      {presets !== undefined && presets.length > 0 && (
        <div class="flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              class="min-h-9 rounded-full border border-slate-300 px-3 text-sm text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-900 focus-visible:ring-2 focus-visible:outline-none"
              onClick={() => onValueChange?.(String(preset))}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
