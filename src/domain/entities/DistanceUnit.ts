import { MAX_EFFICIENCY, MIN_EFFICIENCY } from './validation';

/**
 * Unit the user reads distances in (PRD 10, Phase 2 "Unit conversion").
 *
 * Every distance-shaped value in {@link BatteryState} — efficiency, trip
 * distance, and therefore every range output — is stored in this unit. The
 * calculations are unit-agnostic as long as distance and efficiency agree
 * (`kWh ÷ kWh/100u × 100 = u`), so conversion only happens when the user flips
 * the toggle.
 */
export type DistanceUnit = 'km' | 'mi';

export const DISTANCE_UNITS: readonly DistanceUnit[] = ['km', 'mi'] as const;

/** Exact by international definition. */
export const KM_PER_MILE = 1.609344;

/** Converts a distance between units. */
export function convertDistance(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;
  return to === 'mi' ? value / KM_PER_MILE : value * KM_PER_MILE;
}

/**
 * Converts consumption between kWh/100km and kWh/100mi.
 *
 * The inverse of distance: a mile is longer, so the same car uses *more* energy
 * per 100 mi than per 100 km.
 */
export function convertEfficiency(value: number, from: DistanceUnit, to: DistanceUnit): number {
  if (from === to) return value;
  return to === 'mi' ? value * KM_PER_MILE : value / KM_PER_MILE;
}

/** `"kWh/100km"` / `"kWh/100mi"`. */
export function efficiencyUnitLabel(unit: DistanceUnit): string {
  return `kWh/100${unit}`;
}

/**
 * Plausible consumption window in the given unit (PRD 8.1).
 *
 * The mile bounds are the kilometre bounds converted and rounded to one decimal
 * (5–30 kWh/100km → 8.0–48.3 kWh/100mi), matching the input's `step`.
 */
export function efficiencyBounds(unit: DistanceUnit): { min: number; max: number } {
  return {
    min: roundTenth(convertEfficiency(MIN_EFFICIENCY, 'km', unit)),
    max: roundTenth(convertEfficiency(MAX_EFFICIENCY, 'km', unit)),
  };
}

/** `true` for the two supported unit strings. */
export function isDistanceUnit(value: unknown): value is DistanceUnit {
  return value === 'km' || value === 'mi';
}

function roundTenth(value: number): number {
  return Math.round(value * 10) / 10;
}
