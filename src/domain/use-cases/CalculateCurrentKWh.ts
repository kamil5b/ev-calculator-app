import type { CurrentKWhInput } from '../entities/BatteryState';
import { round1 } from './math';

/**
 * Energy currently stored in the pack.
 *
 * Business rule (PRD 2.2): `currentKWh = (currentBattery / 100) × totalCapacity`,
 * rounded to one decimal so the UI never shows float noise.
 */
export function calculateCurrentKWh({ currentBattery, totalCapacity }: CurrentKWhInput): number {
  return round1((clampPercent(currentBattery) / 100) * sanitiseCapacity(totalCapacity));
}

/** Clamps any input into the 0–100 state-of-charge window. */
function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

/** Treats a missing/garbage capacity as an empty pack rather than `NaN`. */
function sanitiseCapacity(capacity: number): number {
  return Number.isFinite(capacity) ? Math.max(0, capacity) : 0;
}
