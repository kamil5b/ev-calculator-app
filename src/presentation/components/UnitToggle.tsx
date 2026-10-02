import { DISTANCE_UNITS, type DistanceUnit } from '../../domain/entities/DistanceUnit';
import { cn } from '../../lib/utils';

export type UnitToggleProps = {
  value: DistanceUnit;
  onChange: (unit: DistanceUnit) => void;
};

/**
 * `km ⇄ mi` segmented toggle (PRD 10, Phase 2).
 *
 * Two native buttons with `aria-pressed` rather than a custom radio group: they
 * are keyboard-operable for free and announce their state to screen readers.
 */
export function UnitToggle({ value, onChange }: UnitToggleProps) {
  return (
    <div class="flex items-center gap-2" role="group" aria-label="Distance unit">
      <span class="text-sm text-slate-600" aria-hidden="true">
        Distance unit
      </span>
      <div class="inline-flex rounded-lg border border-slate-300 p-0.5">
        {DISTANCE_UNITS.map((unit) => (
          <button
            key={unit}
            type="button"
            aria-pressed={value === unit}
            class={cn(
              'min-h-9 min-w-11 rounded-md px-3 text-sm font-medium transition-colors',
              'focus-visible:ring-slate-900 focus-visible:ring-2 focus-visible:outline-none',
              value === unit ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100',
            )}
            onClick={() => onChange(unit)}
          >
            {unit}
          </button>
        ))}
      </div>
    </div>
  );
}
