/**
 * Numeric primitives shared by the use cases.
 *
 * Every calculation in this layer is a pure function over plain numbers, so the
 * defensive coercion lives here once instead of being repeated per use case.
 */

/** Rounds to one decimal place and normalises `-0` to `0`. */
export function round1(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 10) / 10 || 0;
}

/** Rounds to the nearest whole number and normalises `-0` to `0`. */
export function round0(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.round(value) || 0;
}

/** Clamps a state-of-charge percentage into the 0–100 window. */
export function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Coerces a capacity to a finite, non-negative kWh value. */
export function sanitiseCapacity(capacity: number): number {
  return Number.isFinite(capacity) ? Math.max(0, capacity) : 0;
}

/** Coerces a consumption figure to a finite, strictly positive value. */
export function sanitiseEfficiency(efficiency: number | null | undefined): number | null {
  if (efficiency === null || efficiency === undefined) return null;
  if (!Number.isFinite(efficiency) || efficiency <= 0) return null;
  return efficiency;
}

/** Coerces a price per kWh to a finite, non-negative value. */
export function sanitiseRate(rate: number | null | undefined): number | null {
  if (rate === null || rate === undefined) return null;
  if (!Number.isFinite(rate) || rate < 0) return null;
  return rate;
}
