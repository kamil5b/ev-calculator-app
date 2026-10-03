import { useState } from 'preact/hooks';
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
 *
 * The header value is an editable number field so values can be typed as well
 * as dragged. It keeps its own draft text while typing: committing on every
 * keystroke would clamp or round half-typed values (a cleared field would
 * become `min`), so the draft is discarded on blur and the slider falls back to
 * the authoritative value.
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
  const [draft, setDraft] = useState<string | null>(null);

  const commitDraft = (raw: string) => {
    setDraft(raw);
    if (raw.trim() === '') return;
    const parsed = Number(raw);
    if (!Number.isFinite(parsed)) return;
    onValueChange(Math.min(max, Math.max(min, parsed)));
  };

  const handleSliderChange = (event: JSX.TargetedEvent<HTMLInputElement, Event>) => {
    setDraft(null);
    onValueChange(Number((event.currentTarget as HTMLInputElement).value));
  };

  return (
    <div class={cn('space-y-1.5', className)}>
      <div class="flex items-center justify-between gap-3">
        <label class="text-sm font-medium text-slate-700" for={inputId}>
          {label}
        </label>

        <div class="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            value={draft ?? String(safeValue)}
            aria-label={`${label} (${unit})`}
            aria-invalid={error ? 'true' : undefined}
            class="min-h-9 w-20 rounded-lg border border-slate-300 bg-white px-2 py-1 text-right text-sm text-slate-900 tabular-nums focus-visible:ring-slate-900 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none"
            onInput={(event) => commitDraft(event.currentTarget.value)}
            onBlur={() => setDraft(null)}
          />
          <span class="text-sm text-slate-500" aria-hidden="true">
            {unit}
          </span>
        </div>
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
        onInput={handleSliderChange}
        onChange={handleSliderChange}
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
