import { cn } from '../../../lib/utils';
import type { JSX } from 'preact';

export type SliderProps = Omit<JSX.HTMLAttributes<HTMLInputElement>, 'type' | 'value'> & {
  /** Accessible name; also used as the visible label. */
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  error?: string;
  onValueChange: (value: number) => void;
};

/**
 * Percentage slider built on the native `<input type="range">`.
 *
 * A native range input is used deliberately over a custom ARIA slider: it brings
 * keyboard support, screen-reader announcements and touch handling for free,
 * which is what PRD 5.4 and Appendix C require. The visual track fill is painted
 * with a CSS custom property so no JS layout measurement is needed.
 */
export function Slider({
  label,
  value,
  min = 0,
  max = 100,
  step = 1,
  unit = '%',
  error,
  class: className,
  onValueChange,
  ...props
}: SliderProps) {
  const safeValue = Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : min;
  const fill = max === min ? 0 : ((safeValue - min) / (max - min)) * 100;
  const inputId = `slider-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  const handleChange = (event: JSX.TargetedEvent<HTMLInputElement, Event>) => {
    onValueChange(Number((event.currentTarget as HTMLInputElement).value));
  };

  return (
    <div class={cn('space-y-1.5', className)}>
      <div class="flex items-baseline justify-between gap-3">
        <label class="text-sm font-medium text-slate-700" for={inputId}>
          {label}
        </label>
        {/* `aria-hidden` keeps the live value in the native slider announcement
            instead of reading it twice. */}
        <span class="text-sm font-semibold text-slate-900 tabular-nums" aria-hidden="true">
          {safeValue}
          {unit}
        </span>
      </div>

      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={safeValue}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={safeValue}
        aria-valuetext={`${safeValue}${unit}`}
        aria-invalid={error ? 'true' : undefined}
        style={{ '--slider-fill': `${fill}%` }}
        class="ev-slider min-h-11 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none"
        onInput={handleChange}
        onChange={handleChange}
        {...props}
      />

      {error !== undefined && (
        <p class="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
